import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
  const { user, loading, signOut } = useAuth()
  const { profile } = useUserProfile(user)

  useEffect(() => {
    if (!loading && !user) navigate('/login', { replace: true })
  }, [loading, user, navigate])

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

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

  const displayName =
    profile?.first_name ||
    (profile?.username ? `@${profile.username}` : null) ||
    user.email ||
    'Профиль'

  return (
    <Layout>
      <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur">
          <h1 className="bg-gradient-to-b from-white to-neutral-400 bg-clip-text text-3xl font-black tracking-tight text-transparent">
            {displayName}
          </h1>
          {user.email && (
            <p className="mt-2 break-all text-sm text-neutral-400">
              {user.email}
            </p>
          )}
          {profile?.username && profile?.first_name && (
            <p className="mt-1 text-sm text-neutral-500">@{profile.username}</p>
          )}

          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="text-xs uppercase tracking-wider text-neutral-500">
              Баланс генераций
            </div>
            <div className="mt-1 text-3xl font-semibold">
              {left}{' '}
              <span className="text-base font-normal text-neutral-400">
                из {limit}
              </span>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <Link
              to="/try"
              className="rounded-full bg-white px-6 py-3 text-center text-sm font-semibold text-neutral-950 transition hover:bg-orange-500 hover:text-white"
            >
              Примерить диски →
            </Link>
            <button
              onClick={handleSignOut}
              className="rounded-full border border-white/15 px-6 py-3 text-sm text-neutral-300 transition hover:bg-white/5 hover:text-white"
            >
              Выйти
            </button>
          </div>
        </div>
      </div>
    </Layout>
  )
}
