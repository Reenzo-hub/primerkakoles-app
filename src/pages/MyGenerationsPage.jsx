import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout.jsx'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../lib/useAuth.js'
import { useSeo } from '../lib/useSeo.js'

const PAGE_SIZE = 60

const VIEW_LABELS = {
  result: 'Результат',
  car: 'Авто',
  wheel: 'Диск',
}

export default function MyGenerationsPage() {
  useSeo({
    title: 'Мои примерки · Примерка Колёс',
    description: 'Ваши примерки дисков на автомобиль.',
  })

  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [preview, setPreview] = useState(null)
  const [view, setView] = useState('result')

  useEffect(() => {
    if (!authLoading && !user) navigate('/login', { replace: true })
  }, [authLoading, user, navigate])

  useEffect(() => {
    if (!user) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      const { data, error: err } = await supabase
        .from('generations')
        .select('id, car_url, wheel_url, result_url, source, created_at')
        .eq('auth_user_id', user.id)
        .not('result_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE)

      if (cancelled) return
      if (err) setError(err.message)
      setItems(data || [])
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [user?.id])

  useEffect(() => {
    if (!preview) return
    const onKey = (e) => {
      if (e.key === 'Escape') closePreview()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [preview])

  const openPreview = (item) => {
    setView('result')
    setPreview(item)
  }
  const closePreview = () => setPreview(null)

  const activeUrl = preview ? preview[`${view}_url`] : null

  if (authLoading || !user) {
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
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-8 text-center sm:text-left">
          <h1 className="bg-gradient-to-b from-white to-neutral-400 bg-clip-text text-3xl font-black tracking-tight text-transparent sm:text-5xl">
            Мои примерки
          </h1>
          <p className="mt-2 text-sm text-neutral-400 sm:text-base">
            Ваши сохранённые генерации
          </p>
        </div>

        {loading && <p className="text-sm text-neutral-400">Загрузка...</p>}
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}
        {!loading && !error && items.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center backdrop-blur">
            <p className="text-sm text-neutral-400">
              Вы ещё не сделали ни одной примерки.
            </p>
            <Link
              to="/try"
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-orange-500 hover:text-white"
            >
              Примерить диски →
            </Link>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => openPreview(item)}
              className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] text-left backdrop-blur transition hover:border-white/25"
            >
              <img
                src={item.result_url}
                alt="Моя примерка"
                className="aspect-square w-full object-cover transition group-hover:scale-105"
                loading="lazy"
              />
              <div className="p-3 text-xs text-neutral-400">
                {formatDate(item.created_at)}
              </div>
            </button>
          ))}
        </div>
      </div>

      {preview && (
        <div
          onClick={closePreview}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/90 p-4"
        >
          <button
            onClick={(e) => {
              e.stopPropagation()
              closePreview()
            }}
            aria-label="Закрыть"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur transition hover:bg-white/20"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {activeUrl && (
            <img
              src={activeUrl}
              alt={VIEW_LABELS[view]}
              className="max-h-[78vh] max-w-full rounded-xl"
              onClick={(e) => e.stopPropagation()}
            />
          )}

          <div
            className="flex gap-2 rounded-full border border-white/10 bg-white/5 p-1 backdrop-blur"
            onClick={(e) => e.stopPropagation()}
          >
            {['result', 'car', 'wheel'].map((key) =>
              preview[`${key}_url`] ? (
                <button
                  key={key}
                  onClick={() => setView(key)}
                  className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
                    view === key
                      ? 'bg-white text-neutral-950'
                      : 'text-neutral-300 hover:bg-white/10'
                  }`}
                >
                  {VIEW_LABELS[key]}
                </button>
              ) : null,
            )}
          </div>
        </div>
      )}
    </Layout>
  )
}

function formatDate(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('ru-RU')
  } catch {
    return iso
  }
}
