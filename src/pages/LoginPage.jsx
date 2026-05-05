import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout.jsx'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../lib/useAuth.js'
import { useSeo } from '../lib/useSeo.js'

export default function LoginPage() {
  useSeo({
    title: 'Вход · Примерка Колёс',
    description:
      'Создайте кабинет или войдите по email и паролю, чтобы сохранять примерки и отслеживать баланс генераций.',
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
            Кабинет
          </h1>
          <p className="mt-2 text-sm text-neutral-400">
            Зарегистрируйтесь по email или войдите в уже созданный кабинет.
          </p>

          <EmailPasswordSection />

          <Divider />

          <PhoneSoon />

          <p className="mt-6 text-center text-xs text-neutral-500">
            Забыли пароль? Напишите в{' '}
            <Link
              to="/support"
              className="text-neutral-300 underline-offset-4 transition hover:text-white hover:underline"
            >
              поддержку
            </Link>
            .
          </p>
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

function EmailPasswordSection() {
  const [mode, setMode] = useState('register')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)

  const normalizedEmail = email.trim().toLowerCase()
  const passwordValid = password.length >= 6
  const emailValid = useMemo(() => /\S+@\S+\.\S+/.test(normalizedEmail), [normalizedEmail])
  const canSubmit = emailValid && passwordValid && !submitting

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!canSubmit) return

    setSubmitting(true)
    setError(null)
    setMessage(null)

    const authCall =
      mode === 'register'
        ? supabase.auth.signUp({
            email: normalizedEmail,
            password,
          })
        : supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password,
          })

    const { data, error: err } = await authCall
    setSubmitting(false)

    if (err) {
      setError(getAuthErrorMessage(err.message))
      return
    }

    if (mode === 'register' && !data.session) {
      setMessage(
        'Кабинет создан. Теперь можно войти с этим email и паролем.',
      )
    }
  }

  const switchMode = (nextMode) => {
    setMode(nextMode)
    setError(null)
    setMessage(null)
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2 rounded-full border border-white/10 bg-white/5 p-1">
        <button
          type="button"
          onClick={() => switchMode('register')}
          className={`rounded-full px-4 py-2 text-sm font-medium transition ${
            mode === 'register'
              ? 'bg-white text-neutral-950'
              : 'text-neutral-300 hover:bg-white/10 hover:text-white'
          }`}
        >
          Регистрация
        </button>
        <button
          type="button"
          onClick={() => switchMode('login')}
          className={`rounded-full px-4 py-2 text-sm font-medium transition ${
            mode === 'login'
              ? 'bg-white text-neutral-950'
              : 'text-neutral-300 hover:bg-white/10 hover:text-white'
          }`}
        >
          Вход
        </button>
      </div>

      <input
        type="email"
        inputMode="email"
        autoComplete="email"
        autoFocus
        placeholder="email@example.ru"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full rounded-full border border-white/10 bg-white/5 px-5 py-3 text-white placeholder:text-neutral-500 focus:border-white/30 focus:outline-none"
      />

      <input
        type="password"
        autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
        placeholder="Пароль от 6 символов"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full rounded-full border border-white/10 bg-white/5 px-5 py-3 text-white placeholder:text-neutral-500 focus:border-white/30 focus:outline-none"
      />

      <button
        type="submit"
        disabled={!canSubmit}
        className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-orange-500 hover:text-white disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-500"
      >
        {submitting
          ? mode === 'register'
            ? 'Создаём кабинет...'
            : 'Входим...'
          : mode === 'register'
          ? 'Создать кабинет'
          : 'Войти'}
      </button>

      {!passwordValid && password.length > 0 && (
        <p className="text-xs text-neutral-500">Минимум 6 символов.</p>
      )}

      {message && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
          {message}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
          {error}
        </div>
      )}
    </form>
  )
}

function PhoneSoon() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-neutral-300">
          Войти через телефон
        </span>
        <span className="rounded-full bg-orange-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-orange-300">
          Скоро
        </span>
      </div>
      <p className="mt-2 text-xs text-neutral-500">
        Вернём телефонный вход позже, когда подберём подходящий канал.
      </p>
    </div>
  )
}

function getAuthErrorMessage(message) {
  if (!message) return 'Не удалось выполнить действие. Попробуйте ещё раз.'
  const lower = message.toLowerCase()
  if (lower.includes('invalid login credentials')) {
    return 'Неверный email или пароль.'
  }
  if (lower.includes('user already registered') || lower.includes('already registered')) {
    return 'Кабинет с таким email уже есть. Переключитесь на вход.'
  }
  if (lower.includes('password')) {
    return 'Проверьте пароль: минимум 6 символов.'
  }
  if (lower.includes('email')) {
    return 'Проверьте email.'
  }
  return message
}
