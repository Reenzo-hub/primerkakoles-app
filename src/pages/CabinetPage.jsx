import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Layout from '../components/Layout.jsx'
import { useAuth } from '../lib/useAuth.js'
import { useUserProfile } from '../lib/useUserProfile.js'
import { useSeo } from '../lib/useSeo.js'

export default function CabinetPage() {
  useSeo({
    title: 'Кабинет · Примерка Колёс',
    description: 'Ваш баланс генераций и настройки аккаунта.',
  })

  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, loading } = useAuth()
  const { profile, refetch } = useUserProfile(user)
  const [checkingPayment, setCheckingPayment] = useState(false)

  const hasPaymentReturn = searchParams.get('payment') === 'return'

  useEffect(() => {
    if (!loading && !user) navigate('/login', { replace: true })
  }, [loading, user, navigate])

  useEffect(() => {
    if (!user || !hasPaymentReturn) return undefined

    let cancelled = false
    setCheckingPayment(true)

    const run = async () => {
      await refetch()
      if (!cancelled) setCheckingPayment(false)
    }

    const firstTimer = window.setTimeout(run, 800)
    const secondTimer = window.setTimeout(run, 3500)

    return () => {
      cancelled = true
      window.clearTimeout(firstTimer)
      window.clearTimeout(secondTimer)
    }
  }, [hasPaymentReturn, refetch, user])

  if (loading || !user) {
    return (
      <Layout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
        </div>
      </Layout>
    )
  }

  const used = profile?.generations_used ?? 0
  const limit = profile?.generations_limit ?? 0
  const left = Math.max(0, limit - used)
  const paymentNotice = !hasPaymentReturn
    ? null
    : checkingPayment
    ? 'Проверяем оплату и обновляем баланс...'
    : 'Если оплата уже прошла, баланс обновится автоматически или после ручного обновления.'

  const phoneFormatted = formatPhone(profile?.phone || user.phone)

  const displayName =
    profile?.first_name ||
    (profile?.username ? `@${profile.username}` : null) ||
    phoneFormatted ||
    user.email ||
    'Профиль'

  const subtitle =
    (profile?.first_name || profile?.username) && phoneFormatted
      ? phoneFormatted
      : user.email && displayName !== user.email
      ? user.email
      : null

  return (
    <Layout>
      <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur">
          <h1 className="bg-gradient-to-b from-white to-neutral-400 bg-clip-text text-3xl font-black tracking-tight text-transparent">
            {displayName}
          </h1>
          {subtitle && (
            <p className="mt-2 break-all text-sm text-neutral-400">{subtitle}</p>
          )}
          {profile?.username && profile?.first_name && (
            <p className="mt-1 text-sm text-neutral-500">@{profile.username}</p>
          )}

          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="text-xs uppercase tracking-wider text-neutral-500">
              Баланс генераций
            </div>
            {left > 0 ? (
              <div className="mt-1 text-3xl font-semibold">
                {left}{' '}
                <span className="text-base font-normal text-neutral-400">
                  из {limit}
                </span>
              </div>
            ) : (
              <p className="mt-2 text-sm font-medium text-neutral-200">
                У вас нет доступных примерок
              </p>
            )}
          </div>

          {paymentNotice && (
            <div className="mt-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-sm text-emerald-100">
              <p>{paymentNotice}</p>
              {!checkingPayment && (
                <button
                  type="button"
                  onClick={refetch}
                  className="mt-3 rounded-full border border-emerald-300/30 px-4 py-2 text-xs font-semibold text-emerald-50 transition hover:bg-emerald-400/10"
                >
                  Обновить баланс
                </button>
              )}
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3">
            <Link
              to="/try"
              className="rounded-full bg-white px-6 py-3 text-center text-sm font-semibold text-neutral-950 transition hover:bg-orange-500 hover:text-white"
            >
              Примерить диски →
            </Link>
            <Link
              to="/cabinet/buy"
              className="rounded-full border border-white/15 px-6 py-3 text-center text-sm font-semibold text-neutral-200 transition hover:bg-white/5 hover:text-white"
            >
              Купить генерации →
            </Link>
            <Link
              to="/my"
              className="rounded-full border border-white/15 px-6 py-3 text-center text-sm font-semibold text-neutral-200 transition hover:bg-white/5 hover:text-white"
            >
              Мои примерки →
            </Link>
          </div>
        </div>

        <div className="mt-4 rounded-3xl border border-sky-400/20 bg-sky-500/10 p-6 text-center backdrop-blur">
          <p className="text-sm text-sky-100">
            Тестовую примерку вы можете сделать в нашем Telegram-боте.
          </p>
          <a
            href="https://t.me/primerkakoles_bot"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex w-full justify-center rounded-full bg-sky-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-sky-400"
          >
            Telegram-бот →
          </a>
        </div>
      </div>
    </Layout>
  )
}

function formatPhone(raw) {
  if (!raw) return null
  const digits = String(raw).replace(/\D/g, '')
  if (digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8'))) {
    const d = '7' + digits.slice(1)
    return `+${d.slice(0, 1)} (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7, 9)}-${d.slice(9, 11)}`
  }
  return raw.startsWith('+') ? raw : `+${raw}`
}
