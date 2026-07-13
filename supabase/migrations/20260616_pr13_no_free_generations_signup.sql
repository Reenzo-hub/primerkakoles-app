-- PR 13: enforce zero free generations for new web signups.
--
-- This migration intentionally replaces the auth signup trigger again so the
-- latest database state cannot fall back to the old "1 free generation" logic.
-- It also removes any still-unused starter grants from web-auth users.

begin;

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
  values (new.id, new.email, new.phone, 0, 0)
  on conflict (auth_user_id) do update
  set
    email = coalesce(excluded.email, public.users.email),
    phone = coalesce(excluded.phone, public.users.phone),
    generations_limit = case
      when public.users.generations_limit = 1
        and coalesce(public.users.generations_used, 0) = 0
        then 0
      else public.users.generations_limit
    end,
    generations_used = coalesce(public.users.generations_used, 0),
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

update public.users
set
  generations_limit = 0,
  updated_at = now()
where auth_user_id is not null
  and generations_limit = 1
  and coalesce(generations_used, 0) = 0;

commit;
