import { useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext.jsx'

const BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'primerkakoles_bot'

export default function TelegramLogin() {
  const containerRef = useRef(null)
  const { loginWithTelegram, loading, error } = useAuth()

  useEffect(() => {
    window.onTelegramAuth = (tgUser) => {
      loginWithTelegram(tgUser).catch(() => {})
    }

    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.async = true
    script.setAttribute('data-telegram-login', BOT_USERNAME)
    script.setAttribute('data-size', 'large')
    script.setAttribute('data-radius', '12')
    script.setAttribute('data-onauth', 'onTelegramAuth(user)')
    script.setAttribute('data-request-access', 'write')

    const mount = containerRef.current
    if (mount) mount.appendChild(script)

    return () => {
      if (mount && script.parentNode === mount) mount.removeChild(script)
      delete window.onTelegramAuth
    }
  }, [loginWithTelegram])

  return (
    <div className="flex flex-col items-center gap-3">
      <div ref={containerRef} className="flex justify-center" />
      {loading && <p className="text-sm text-neutral-400">Авторизация...</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}
      <p className="text-xs text-neutral-500">
        Нажимая «Войти», вы соглашаетесь на передачу данных профиля
      </p>
    </div>
  )
}
