-- PR 12: include users.plan in the admin dashboard RPC.
--
-- Run this after PR 11 if the dashboard already exists in Supabase. Existing
-- deployments of admin_get_dashboard keep their old SELECT list until the
-- function is replaced.

begin;

create or replace function public.admin_get_dashboard()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_users jsonb;
  v_generations jsonb;
  v_orders jsonb;
  v_user_count integer;
  v_generation_count integer;
  v_order_count integer;
begin
  if not public.is_admin_user() then
    raise exception 'admin access required' using errcode = '42501';
  end if;

  select count(*) into v_user_count from public.users;
  select count(*) into v_generation_count from public.generations;
  select count(*) into v_order_count from public.generation_orders;

  select coalesce(jsonb_agg(to_jsonb(u)), '[]'::jsonb)
  into v_users
  from (
    select
      id,
      auth_user_id,
      email,
      phone,
      chat_id,
      first_name,
      username,
      plan,
      generations_limit,
      generations_used,
      updated_at
    from public.users
    order by updated_at desc nulls last
    limit 5000
  ) u;

  select coalesce(jsonb_agg(to_jsonb(g)), '[]'::jsonb)
  into v_generations
  from (
    select
      id,
      auth_user_id,
      chat_id,
      car_url,
      wheel_url,
      result_url,
      source,
      created_at
    from public.generations
    order by created_at desc nulls last
    limit 5000
  ) g;

  select coalesce(jsonb_agg(to_jsonb(o)), '[]'::jsonb)
  into v_orders
  from (
    select
      id,
      auth_user_id,
      user_id,
      package_code,
      generations_count,
      amount_rub,
      currency,
      status,
      yookassa_payment_id,
      credited_at,
      created_at,
      updated_at
    from public.generation_orders
    order by created_at desc nulls last
    limit 5000
  ) o;

  return jsonb_build_object(
    'users', v_users,
    'generations', v_generations,
    'orders', v_orders,
    'meta', jsonb_build_object(
      'user_count', v_user_count,
      'generation_count', v_generation_count,
      'order_count', v_order_count
    )
  );
end;
$$;

revoke all on function public.admin_get_dashboard() from public;
grant execute on function public.admin_get_dashboard() to authenticated;

commit;
