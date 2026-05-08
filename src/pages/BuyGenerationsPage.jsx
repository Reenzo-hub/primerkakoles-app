import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout.jsx'
import { PAYMENT_PACKAGES } from '../lib/paymentPackages.js'
import { createPaymentOrder } from '../lib/payments.js'
import { useAuth } from '../lib/useAuth.js'
import { useSeo } from '../lib/useSeo.js'
import { useUserProfile } from '../lib/useUserProfile.js'

export default function BuyGenerationsPage() {
  useSeo({
    title: 'Купить генерации · Примерка Колёс',
    description: 'Пополните баланс генераций для виртуальной примерки дисков.',
  })

  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const { profile, loading: profileLoading } = useUserProfile(user)
  const [selectedCode, setSelectedCode] = useState(null)
  const [errorMsg, setErrorMsg] = useState(null)

  useEffect(() => {
    if (!authLoading && !user) navigate('/login', { replace: true })
  }, [authLoading, user, navigate])

  const used = profile?.generations_used ?? 0
  const limit = profile?.generations_limit ?? 0
  const left = Math.max(0, limit - used)
  const isLoading = authLoading || profileLoading

  const handleBuy = async (packageCode) => {
    setSelectedCode(packageCode)
    setErrorMsg(null)
    try {
      const { confirmation_url } = await createPaymentOrder(packageCode)
      window.location.href = confirmation_url
    } catch (error) {
      setErrorMsg(error.message || 'Не удалось перейти к оплате.')
      setSelectedCode(null)
    }
  }

  if (isLoading || !user) {
    return (
      <Layout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              to="/cabinet"
              className="text-sm text-neutral-400 underline-offset-4 transition hover:text-white hover:underline"
            >
              ← В кабинет
            </Link>
            <h1 className="mt-3 bg-gradient-to-b from-white to-neutral-400 bg-clip-text text-3xl font-black tracking-tight text-transparent sm:text-5xl">
              Купить генерации
            </h1>
            <p className="mt-3 max-w-xl text-sm text-neutral-400 sm:text-base">
              Выберите пакет примерок. После оплаты баланс обновится в кабинете.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
            <div className="text-xs uppercase tracking-wider text-neutral-500">
              Сейчас доступно
            </div>
            <div className="mt-1 text-2xl font-semibold text-white">
              {left}{' '}
              <span className="text-sm font-normal text-neutral-400">
                из {limit}
              </span>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            {errorMsg}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          {PAYMENT_PACKAGES.map((item) => {
            const isSubmitting = selectedCode === item.code
            const disabled = selectedCode !== null
            return (
              <article
                key={item.code}
                className="flex min-h-[260px] flex-col rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold text-white">
                      {item.title}
                    </h2>
                    <p className="mt-2 text-sm text-neutral-400">
                      {item.description}
                    </p>
                  </div>
                  {item.badge && (
                    <span className="rounded-full bg-orange-500/20 px-3 py-1 text-xs font-semibold text-orange-200">
                      {item.badge}
                    </span>
                  )}
                </div>

                <div className="mt-6">
                  <div className="text-4xl font-black tracking-tight text-white">
                    {item.priceRub} ₽
                  </div>
                  <div className="mt-1 text-sm text-neutral-500">
                    {item.generations} генераций
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleBuy(item.code)}
                  disabled={disabled}
                  className="mt-auto rounded-full bg-white px-6 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-orange-500 hover:text-white disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-500"
                >
                  {isSubmitting ? 'Создаём платёж...' : 'Перейти к оплате'}
                </button>
              </article>
            )
          })}
        </div>
      </div>
    </Layout>
  )
}
