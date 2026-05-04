import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout.jsx'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../lib/useAuth.js'
import { useSeo } from '../lib/useSeo.js'

const RESEND_DELAY_SEC = 30

export default function LoginPage() {
  useSeo({
    title: 'Вход · Примерка Колёс',
    description:
      'Войдите по SMS, чтобы сохранять примерки и отслеживать баланс генераций.',
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
            Получите код по SMS — это быстрее, чем регистрация.
          </p>

          <SmsSection />

          <Divider />

          <TelegramSoon />
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

function SmsSection() {
  const [step, setStep] = useState('phone') // phone | code
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState(null)
  const [resendIn, setResendIn] = useState(0)

  useEffect(() => {
    if (resendIn <= 0) return
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [resendIn])

  const phoneDigits = phone
  const e164 = '+7' + phoneDigits
  const phoneValid = phoneDigits.length === 10

  const sendCode = async (e) => {
    e?.preventDefault()
    if (!phoneValid) return
    setSending(true)
    setError(null)
    const { error: err } = await supabase.auth.signInWithOtp({ phone: e164 })
    setSending(false)
    if (err) {
      setError(err.message)
      return
    }
    setStep('code')
    setResendIn(RESEND_DELAY_SEC)
  }

  const verifyCode = async (e) => {
    e?.preventDefault()
    if (code.length !== 6) return
    setVerifying(true)
    setError(null)
    const { error: err } = await supabase.auth.verifyOtp({
      phone: e164,
      token: code,
      type: 'sms',
    })
    setVerifying(false)
    if (err) {
      setError(err.message)
      return
    }
    // useAuth picks up the new session and LoginPage redirects to /cabinet.
  }

  if (step === 'code') {
    return (
      <form onSubmit={verifyCode} className="mt-6 flex flex-col gap-3">
        <p className="text-sm text-neutral-300">
          Код отправлен на{' '}
          <span className="font-semibold text-white">{formatRu(phoneDigits)}</span>
        </p>

        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          maxLength={6}
          placeholder="000000"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-center text-lg tracking-[0.5em] text-white placeholder:text-neutral-600 focus:border-white/30 focus:outline-none"
        />

        <button
          type="submit"
          disabled={code.length !== 6 || verifying}
          className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-orange-500 hover:text-white disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-500"
        >
          {verifying ? 'Проверка...' : 'Войти'}
        </button>

        <div className="flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={() => {
              setStep('phone')
              setCode('')
              setError(null)
            }}
            className="text-neutral-400 transition hover:text-white"
          >
            ← Изменить номер
          </button>
          {resendIn > 0 ? (
            <span className="text-neutral-500">
              Повторно через {resendIn} с
            </span>
          ) : (
            <button
              type="button"
              onClick={sendCode}
              disabled={sending}
              className="text-neutral-300 transition hover:text-white disabled:opacity-50"
            >
              {sending ? 'Отправка...' : 'Отправить ещё раз'}
            </button>
          )}
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
            {error}
          </div>
        )}
      </form>
    )
  }

  return (
    <form onSubmit={sendCode} className="mt-6 flex flex-col gap-3">
      <input
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
        autoFocus
        placeholder="+7 999 000 00 00"
        value={formatRu(phone)}
        onChange={(e) => setPhone(normalizeRuPhone(e.target.value))}
        className="w-full rounded-full border border-white/10 bg-white/5 px-5 py-3 text-white placeholder:text-neutral-500 focus:border-white/30 focus:outline-none"
      />

      <button
        type="submit"
        disabled={!phoneValid || sending}
        className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-orange-500 hover:text-white disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-500"
      >
        {sending ? 'Отправляем код...' : 'Получить код'}
      </button>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
          {error}
        </div>
      )}
    </form>
  )
}

function TelegramSoon() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-neutral-300">
          Войти через Telegram
        </span>
        <span className="rounded-full bg-orange-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-orange-300">
          Скоро
        </span>
      </div>
      <p className="mt-2 text-xs text-neutral-500">
        Готовим вход через бота — будет в один клик.
      </p>
    </div>
  )
}

function formatRu(digits) {
  if (!digits) return ''
  if (digits.length <= 3) return `+7 ${digits}`
  if (digits.length <= 6) return `+7 ${digits.slice(0, 3)} ${digits.slice(3)}`
  if (digits.length <= 8)
    return `+7 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
  return `+7 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 8)} ${digits.slice(8)}`
}

function normalizeRuPhone(value) {
  const digits = value.replace(/\D/g, '')
  if (digits.startsWith('7') || digits.startsWith('8')) {
    return digits.slice(1, 11)
  }
  return digits.slice(0, 10)
}
