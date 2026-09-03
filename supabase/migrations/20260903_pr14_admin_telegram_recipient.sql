-- PR 14: securely resolve a Telegram recipient for an admin message.
--
-- The n8n webhook calls this RPC with the administrator's Supabase JWT. The
-- browser never sends chat_id and the function returns it only to an admin.

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

create or replace function public.admin_get_telegram_recipient(p_user_id uuid)
returns table (
  user_id uuid,
  chat_id bigint,
  first_name text,
  username text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin_user() then
    raise exception 'admin access required' using errcode = '42501';
  end if;

  return query
  select
    u.id,
    u.chat_id,
    u.first_name,
    u.username
  from public.users u
  where u.id = p_user_id
    and u.chat_id is not null
  limit 1;
end;
$$;

revoke all on function public.admin_get_telegram_recipient(uuid) from public;
grant execute on function public.admin_get_telegram_recipient(uuid)
  to authenticated;

commit;
