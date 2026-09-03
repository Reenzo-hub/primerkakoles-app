-- PR 16: securely resolve a MAX recipient for an admin message.
--
-- MAX users are currently linked through users.chat_id. The selected
-- generation source determines the channel in the admin UI.

begin;

drop function if exists public.admin_get_max_recipient(uuid);

create function public.admin_get_max_recipient(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recipient jsonb;
begin
  if not public.is_admin_user() then
    raise exception 'admin access required' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'user_id', u.id::text,
    'max_user_id', u.chat_id::text,
    'first_name', u.first_name,
    'username', u.username
  )
  into v_recipient
  from public.users u
  where u.id = p_user_id
    and u.chat_id is not null
  limit 1;

  return v_recipient;
end;
$$;

revoke all on function public.admin_get_max_recipient(uuid) from public;
grant execute on function public.admin_get_max_recipient(uuid)
  to authenticated;

commit;
