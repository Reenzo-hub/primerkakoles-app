import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout.jsx'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../lib/useAuth.js'
import { useSeo } from '../lib/useSeo.js'

export default function LoginPage() {
  useSeo({
    title: 'Вход · Примерка Колёс',
    description:
      'Войдите по email, чтобы сохранять примерки и отслеживать баланс генераций.',
  })

  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()

  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!authLoading && user) navigate('/cabinet', { replace: true })
  }, [authLoading, user, navigate])

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
    <Layout>
      <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur">
          <h1 className="bg-gradient-to-b from-white to-neutral-400 bg-clip-text text-3xl font-black tracking-tight text-transparent">
            Вход
          </h1>
          <p className="mt-2 text-sm text-neutral-400">
            Отправим ссылку на почту — кликните по ней, чтобы войти.
          </p>

          {sent ? (
            <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
              Ссылка отправлена на <span className="break-all">{email}</span>.
              Проверьте почту.
            </div>
          ) : (
            <form onSubmit={submit} className="mt-6 flex flex-col gap-3">
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
                className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-orange-500 hover:text-white disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-500"
              >
                {sending ? 'Отправка...' : 'Получить ссылку'}
              </button>
              {error && <p className="text-sm text-red-300">{error}</p>}
            </form>
          )}
        </div>
      </div>
    </Layout>
  )
}
