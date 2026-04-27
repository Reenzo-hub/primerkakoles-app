-- PR 5: extra profile fields for Telegram-originated users
--
-- Telegram Login widget returns first_name and username in addition to id (chat_id).
-- Storing them lets us show a friendlier name in the cabinet and footer.

alter table public.users
  add column if not exists first_name text,
  add column if not exists username text;
