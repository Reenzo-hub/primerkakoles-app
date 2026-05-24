-- PR 10: admin-only dashboard access through Supabase RLS.
--
-- The static frontend can read admin data directly with the anon key, while
-- Supabase decides whether the current authenticated user is the admin.

begin;

create or replace function public.is_admin_user()
returns boolean
language sql
stable
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) in (
    'naydikolesa@yandex.ru',
    'renatio@mail.ru'
  );
$$;

drop policy if exists "admin users read all" on public.users;
create policy "admin users read all" on public.users
  for select to authenticated
  using (public.is_admin_user());

drop policy if exists "admin generation orders read all" on public.generation_orders;
create policy "admin generation orders read all" on public.generation_orders
  for select to authenticated
  using (public.is_admin_user());

create or replace function public.admin_update_user_generation_limit(
  p_user_id uuid,
  p_generations_limit integer
)
returns public.users
language plpgsql
security definer
set search_path = public
as $$
declare
  v_used integer;
begin
  if not public.is_admin_user() then
    raise exception 'admin access required' using errcode = '42501';
  end if;

  if p_user_id is null or p_generations_limit is null or p_generations_limit < 0 then
    raise exception 'invalid generation limit' using errcode = '22023';
  end if;

  select u.generations_used
  into v_used
  from public.users u
  where u.id = p_user_id
  for update;

  if not found then
    raise exception 'user not found' using errcode = 'P0002';
  end if;

  if p_generations_limit < coalesce(v_used, 0) then
    raise exception 'generation limit cannot be lower than generations_used'
      using errcode = '22023';
  end if;

  return query
  update public.users u
  set
    generations_limit = p_generations_limit,
    updated_at = now()
  where u.id = p_user_id
  returning u.*;
end;
$$;

revoke all on function public.admin_update_user_generation_limit(uuid, integer) from public;
grant execute on function public.admin_update_user_generation_limit(uuid, integer)
  to authenticated;

commit;
