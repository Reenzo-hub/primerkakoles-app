import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout.jsx'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../lib/useAuth.js'
import { useSeo } from '../lib/useSeo.js'

const TG_BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME
const TG_AUTH_URL = import.meta.env.VITE_TELEGRAM_AUTH_WEBHOOK_URL

export default function LoginPage() {
  useSeo({
    title: 'Вход · Примерка Колёс',
    description:
      'Войдите через Telegram или SMS, чтобы сохранять примерки и отслеживать баланс генераций.',
  })

  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()

  useEffect(() => {
    if (!authLoading && user) navigate('/cabinet', { replace: true })
  }, [authLoading, user, navigate])

  return (
    <Layout>
      <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur">
          <h1 className="bg-gradient-to-b from-white to-neutral-400 bg-clip-text text-3xl font-black tracking-tight text-transparent">
            Вход
          </h1>
          <p className="mt-2 text-sm text-neutral-400">
            Войдите через Telegram — самый быстрый способ.
          </p>

          <TelegramSection />

          <Divider />

          <SmsSection />

          <Divider />

          <EmailSection />
        </div>
      </div>
    </Layout>
  )
}

function Divider() {
  return (
    <div className="my-6 flex items-center gap-3 text-[10px] uppercase tracking-wider text-neutral-500">
      <hr className="flex-1 border-white/10" />
      <span>или</span>
      <hr className="flex-1 border-white/10" />
    </div>
  )
}

function TelegramSection() {
  const containerRef = useRef(null)
  const [status, setStatus] = useState('idle') // idle | sending | error
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!TG_BOT_USERNAME) return
    if (!containerRef.current) return

    window.onTelegramAuth = async (tgUser) => {
      setStatus('sending')
      setError(null)
      try {
        const res = await fetch(TG_AUTH_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tgUser),
        })
        if (!res.ok) {
          const text = await res.text().catch(() => '')
          throw new Error(text || `Не удалось войти через Telegram (${res.status})`)
        }
        const data = await res.json()
        if (!data?.action_link) throw new Error('Сервер не вернул ссылку входа')
        window.location.href = data.action_link
      } catch (e) {
        setStatus('error')
        setError(e.message || 'Что-то пошло не так')
      }
    }

    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.async = true
    script.setAttribute('data-telegram-login', TG_BOT_USERNAME)
    script.setAttribute('data-size', 'large')
    script.setAttribute('data-radius', '20')
    script.setAttribute('data-onauth', 'onTelegramAuth(user)')
    script.setAttribute('data-request-access', 'write')
    containerRef.current.appendChild(script)

    return () => {
      delete window.onTelegramAuth
    }
  }, [])

  return (
    <div className="mt-6">
      <div ref={containerRef} className="flex justify-center" />
      {status === 'sending' && (
        <div className="mt-3 flex items-center justify-center gap-2 text-xs text-neutral-400">
          <span className="inline-block h-3 w-3 animate-spin rounded-full border border-orange-500 border-t-transparent" />
          Проверяем данные Telegram...
        </div>
      )}
      {status === 'error' && error && (
        <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
          {error}
        </div>
      )}
    </div>
  )
}

function SmsSection() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-neutral-300">По SMS</span>
        <span className="rounded-full bg-orange-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-orange-300">
          Скоро
        </span>
      </div>
      <input
        type="tel"
        disabled
        placeholder="+7 999 000 00 00"
        className="mt-3 w-full cursor-not-allowed rounded-full border border-white/5 bg-neutral-900/40 px-5 py-3 text-neutral-500 placeholder:text-neutral-600 focus:outline-none"
      />
      <button
        type="button"
        disabled
        className="mt-3 w-full cursor-not-allowed rounded-full bg-neutral-800 px-6 py-3 text-sm font-semibold text-neutral-500"
      >
        Получить код
      </button>
    </div>
  )
}

function EmailSection() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    setSending(true)
    setError(null)
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    setSending(false)
    if (err) setError(err.message)
    else setSent(true)
  }

  return (
    <details className="group">
      <summary className="cursor-pointer list-none text-xs text-neutral-500 transition hover:text-neutral-300">
        <span className="inline-flex items-center gap-1">
          Войти по email-ссылке
          <span className="transition group-open:rotate-180">▾</span>
        </span>
      </summary>

      <div className="mt-4">
        {sent ? (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
            Ссылка отправлена на <span className="break-all">{email}</span>. Проверьте
            почту.
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-3">
            <input
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-white placeholder:text-neutral-500 focus:border-white/30 focus:outline-none"
            />
            <button
              type="submit"
              disabled={sending || !email}
              className="rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-neutral-200 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sending ? 'Отправка...' : 'Получить ссылку'}
            </button>
            {error && <p className="text-sm text-red-300">{error}</p>}
          </form>
        )}
      </div>
    </details>
  )
}
