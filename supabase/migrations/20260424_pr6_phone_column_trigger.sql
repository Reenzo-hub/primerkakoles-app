-- PR 6: support phone-only signup
--
-- Adds public.users.phone (nullable, unique among non-null) and updates the
-- handle_new_auth_user trigger to copy auth.users.phone alongside email.

alter table public.users
  add column if not exists phone text;

create unique index if not exists users_phone_key
  on public.users(phone) where phone is not null;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (
    auth_user_id, email, phone, generations_limit, generations_used
  )
  values (new.id, new.email, new.phone, 1, 0)
  on conflict (auth_user_id) do nothing;
  return new;
end;
$$;
