-- PR 7: switch web signup to email/password with no free generations.
--
-- New auth users should still get a public.users profile automatically,
-- but the starting generations balance is now 0 instead of 1.

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
  on conflict (auth_user_id) do nothing;
  return new;
end;
$$;
