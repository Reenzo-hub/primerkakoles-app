import { supabase } from './supabase.js'

const ADMIN_TELEGRAM_WEBHOOK_URL =
  import.meta.env.VITE_ADMIN_TELEGRAM_WEBHOOK_URL

export async function sendAdminTelegramMessage({ userId, message }) {
  if (!ADMIN_TELEGRAM_WEBHOOK_URL) {
    throw new Error('Webhook отправки в Telegram не настроен')
  }

  const text = String(message || '').trim()
  if (!userId) throw new Error('Пользователь не найден')
  if (!text) throw new Error('Введите сообщение')
  if (text.length > 4096) {
    throw new Error('Сообщение не должно превышать 4096 символов')
  }

  const { data } = await supabase.auth.getSession()
  const token = data?.session?.access_token
  if (!token) throw new Error('Нет активной сессии. Войдите заново')

  const response = await fetch(ADMIN_TELEGRAM_WEBHOOK_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_id: userId,
      message: text,
    }),
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok || payload?.ok === false) {
    throw new Error(
      payload?.error || `Не удалось отправить сообщение. Код: ${response.status}`,
    )
  }

  return payload
}
