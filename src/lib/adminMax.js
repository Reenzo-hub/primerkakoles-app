import { supabase } from './supabase.js'

const ADMIN_MAX_WEBHOOK_URL = import.meta.env.VITE_ADMIN_MAX_WEBHOOK_URL

export async function sendAdminMaxMessage({ userId, message }) {
  if (!ADMIN_MAX_WEBHOOK_URL) {
    throw new Error('Webhook отправки в MAX не настроен')
  }

  const text = String(message || '').trim()
  if (!userId) throw new Error('Пользователь не найден')
  if (!text) throw new Error('Введите сообщение')
  if (text.length > 4000) {
    throw new Error('Сообщение не должно превышать 4000 символов')
  }

  const { data } = await supabase.auth.getSession()
  const token = data?.session?.access_token
  if (!token) throw new Error('Нет активной сессии. Войдите заново')

  const response = await fetch(ADMIN_MAX_WEBHOOK_URL, {
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
  const workflowStatus = Number(payload?.statusCode || 0)
  if (
    !response.ok ||
    workflowStatus >= 400 ||
    payload?.ok === false ||
    payload?.ready === false
  ) {
    const diagnosticMessage = String(payload?.diagnostic?.max_message || '')
    const isCertificateError =
      /unable to get local issuer certificate/i.test(diagnosticMessage) ||
      /unable_to_get_issuer_cert_locally/i.test(diagnosticMessage)

    throw new Error(
      isCertificateError
        ? 'На сервере n8n не настроен доверенный сертификат Минцифры для MAX'
        : payload?.error ||
            `Не удалось отправить сообщение. Код: ${response.status}`,
    )
  }

  return payload
}
