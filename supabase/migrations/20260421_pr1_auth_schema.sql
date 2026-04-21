-- PR 1: schema for personal accounts via Supabase Auth
--
-- Changes to public.users:
--   * demote chat_id from PRIMARY KEY to nullable UNIQUE (data preserved)
--   * add id uuid PRIMARY KEY (new identity across Telegram + email users)
--   * add email (nullable, unique among non-null)
--   * add auth_user_id → auth.users(id) (nullable, unique, ON DELETE SET NULL)
--
-- Changes to public.generations:
--   * add auth_user_id (nullable) so web-generated rows can belong to an authed user
--     (Telegram bot keeps writing chat_id as before)
--
-- New trigger on auth.users:
--   * on signup → create public.users row with generations_limit=1, generations_used=0
--
-- RLS:
--   * users: read/update only own row (matched by auth_user_id)
--   * generations: keep existing public SELECT for anon; add INSERT for own authed rows

begin;

create extension if not exists pgcrypto;

-- 1. Add new columns to users (nullable for now)
alter table public.users
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists email text,
  add column if not exists auth_user_id uuid;

-- Backfill id for existing rows (in case defaults didn't fire on pre-existing rows)
update public.users set id = gen_random_uuid() where id is null;

-- 2. generations.chat_id has a FK → users.chat_id (users_pkey). Drop it so we can
--    swap the PK; we'll recreate the FK against a new UNIQUE constraint below.
alter table public.generations drop constraint if exists generations_chat_id_fkey;

-- 3. Swap primary key: drop PK on chat_id, make id the new PK.
--    chat_id data stays untouched — only the constraint changes.
alter table public.users drop constraint users_pkey;
alter table public.users alter column id set not null;
alter table public.users add constraint users_pkey primary key (id);

-- 4. chat_id: nullable + full UNIQUE constraint.
--    Full UNIQUE is required because FKs cannot reference a partial index.
--    Postgres allows multiple NULLs in a UNIQUE constraint by default.
alter table public.users alter column chat_id drop not null;
alter table public.users add constraint users_chat_id_key unique (chat_id);

-- 5. Re-attach the generations → users FK to the new UNIQUE target.
alter table public.generations
  add constraint generations_chat_id_fkey
  foreign key (chat_id) references public.users(chat_id);

-- 6. email: unique among non-null rows (partial index is fine — not a FK target)
create unique index if not exists users_email_key
  on public.users(email) where email is not null;

-- 7. auth_user_id: unique + FK to auth.users
alter table public.users
  add constraint users_auth_user_id_key unique (auth_user_id);
alter table public.users
  add constraint users_auth_user_id_fkey
  foreign key (auth_user_id) references auth.users(id) on delete set null;

-- 8. Link generations to auth users (for web-originated rows).
--    Telegram-originated rows keep chat_id set and auth_user_id NULL.
alter table public.generations
  add column if not exists auth_user_id uuid;
alter table public.generations
  add constraint generations_auth_user_id_fkey
  foreign key (auth_user_id) references auth.users(id) on delete set null;

-- 9. RLS on users: only own row
alter table public.users enable row level security;

drop policy if exists "users read own" on public.users;
create policy "users read own" on public.users
  for select to authenticated
  using (auth.uid() = auth_user_id);

drop policy if exists "users update own" on public.users;
create policy "users update own" on public.users
  for update to authenticated
  using (auth.uid() = auth_user_id)
  with check (auth.uid() = auth_user_id);

-- 10. RLS on generations: keep public SELECT (already created earlier),
--     add INSERT policy for authed users writing their own rows.
drop policy if exists "generations insert own" on public.generations;
create policy "generations insert own" on public.generations
  for insert to authenticated
  with check (auth.uid() = auth_user_id);

-- 11. Trigger: auto-create public.users row on auth.users signup
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (auth_user_id, email, generations_limit, generations_used)
  values (new.id, new.email, 1, 0)
  on conflict (auth_user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

commit;
