-- PR 9: web payments for generation packages.
--
-- Adds a server-owned order ledger for YooKassa payments and an idempotent
-- crediting RPC. The frontend may read its own orders, but it must not create
-- orders, change order statuses, or change generation balances directly.

begin;

create extension if not exists pgcrypto;

alter table public.users
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.generation_orders (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  package_code text not null,
  generations_count integer not null,
  amount_rub integer not null,
  currency text not null default 'RUB',
  status text not null default 'pending',
  yookassa_payment_id text unique,
  confirmation_url text,
  credited_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint generation_orders_package_code_check
    check (package_code in ('pack_1', 'pack_5', 'pack_10')),
  constraint generation_orders_generations_count_check
    check (generations_count in (1, 5, 10)),
  constraint generation_orders_amount_rub_check
    check (amount_rub in (60, 199, 349)),
  constraint generation_orders_currency_check
    check (currency = 'RUB'),
  constraint generation_orders_status_check
    check (status in ('pending', 'succeeded', 'canceled', 'failed')),
  constraint generation_orders_pack_amount_check
    check (
      (package_code = 'pack_1' and generations_count = 1 and amount_rub = 60)
      or (package_code = 'pack_5' and generations_count = 5 and amount_rub = 199)
      or (package_code = 'pack_10' and generations_count = 10 and amount_rub = 349)
    ),
  constraint generation_orders_credit_status_check
    check (credited_at is null or status = 'succeeded')
);

create index if not exists generation_orders_auth_user_id_created_at_idx
  on public.generation_orders (auth_user_id, created_at desc);

create index if not exists generation_orders_status_created_at_idx
  on public.generation_orders (status, created_at desc);

create or replace function public.touch_generation_orders_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_generation_orders_updated_at on public.generation_orders;
create trigger touch_generation_orders_updated_at
  before update on public.generation_orders
  for each row execute function public.touch_generation_orders_updated_at();

alter table public.generation_orders enable row level security;

drop policy if exists "generation orders read own" on public.generation_orders;
create policy "generation orders read own" on public.generation_orders
  for select to authenticated
  using (auth.uid() = auth_user_id);

revoke all on public.generation_orders from anon, authenticated;
grant select on public.generation_orders to authenticated;

-- Keep profile editing possible in future, but remove browser-side balance writes.
revoke update on public.users from anon, authenticated;
grant update (phone, first_name, username, updated_at) on public.users to authenticated;

create or replace function public.credit_generation_order(p_order_id uuid)
returns table (
  order_id uuid,
  credited boolean,
  added_generations integer,
  new_generations_limit integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.generation_orders%rowtype;
  v_new_limit integer;
begin
  select *
  into v_order
  from public.generation_orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'generation order % not found', p_order_id
      using errcode = 'P0002';
  end if;

  if v_order.status <> 'succeeded' then
    raise exception 'generation order % is not succeeded', p_order_id
      using errcode = 'P0001';
  end if;

  if v_order.credited_at is not null then
    select generations_limit
    into v_new_limit
    from public.users
    where id = v_order.user_id;

    order_id := v_order.id;
    credited := false;
    added_generations := 0;
    new_generations_limit := v_new_limit;
    return next;
    return;
  end if;

  update public.users
  set
    generations_limit = coalesce(generations_limit, 0) + v_order.generations_count,
    updated_at = now()
  where id = v_order.user_id
  returning generations_limit into v_new_limit;

  update public.generation_orders
  set credited_at = now()
  where id = v_order.id;

  order_id := v_order.id;
  credited := true;
  added_generations := v_order.generations_count;
  new_generations_limit := v_new_limit;
  return next;
end;
$$;

revoke all on function public.credit_generation_order(uuid) from public;
grant execute on function public.credit_generation_order(uuid) to service_role;

commit;
