import { supabase } from './supabase.js'

const PAYMENT_WEBHOOK_URL = import.meta.env.VITE_PAYMENT_WEBHOOK_URL

export async function createPaymentOrder(packageCode) {
  if (!PAYMENT_WEBHOOK_URL) {
    throw new Error('Оплата временно недоступна. Не настроен платёжный webhook.')
  }

  const { data } = await supabase.auth.getSession()
  const token = data?.session?.access_token
  if (!token) throw new Error('Нет активной сессии. Войдите заново.')

  const response = await fetch(PAYMENT_WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ package_code: packageCode }),
  })

  let payload = null
  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    payload = await response.json().catch(() => null)
  }

  if (!response.ok) {
    throw new Error(
      payload?.error ||
        payload?.message ||
        `Не удалось создать платёж. Код: ${response.status}`,
    )
  }

  if (!payload?.confirmation_url) {
    throw new Error('Платёж создан без ссылки на оплату. Напишите в поддержку.')
  }

  return payload
}
