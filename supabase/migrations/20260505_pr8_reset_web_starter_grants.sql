-- PR 8: remove old web starter grants that were created before PR 7 applied.
--
-- This targets authenticated web users that still have the old unused
-- "1 free generation" starter balance.

update public.users
set generations_limit = 0
where auth_user_id is not null
  and generations_limit = 1
  and generations_used = 0;
