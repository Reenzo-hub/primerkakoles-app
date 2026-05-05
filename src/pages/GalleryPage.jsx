import { useEffect, useState } from 'react'
import Layout from '../components/Layout.jsx'
import { supabase } from '../lib/supabase.js'
import { fetchEdgeJson, toMediaUrl } from '../lib/edgeApi.js'
import { useSeo } from '../lib/useSeo.js'

const PAGE_SIZE = 60

const VIEW_LABELS = {
  result: 'Результат',
  car: 'Авто',
  wheel: 'Диск',
}

export default function GalleryPage() {
  useSeo({
    title: 'Примеры примерки дисков — галерея готовых работ · Примерка Колёс',
    description:
      'Галерея примерок дисков на разных автомобилях. Посмотрите, как выглядят популярные модели колёс на реальных машинах — и подберите свой вариант.',
  })

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [preview, setPreview] = useState(null)
  const [view, setView] = useState('result')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      const { data, error: err } = await fetchGalleryItems()

      if (cancelled) return
      if (err) setError(err.message)
      setItems(data || [])
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [])

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

  const activeUrl = preview ? toMediaUrl(preview[`${view}_url`]) : null

  return (
    <Layout>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-8 text-center sm:text-left">
          <h1 className="bg-gradient-to-b from-white to-neutral-400 bg-clip-text text-3xl font-black tracking-tight text-transparent sm:text-5xl">
            Примеры
          </h1>
          <p className="mt-2 text-sm text-neutral-400 sm:text-base">
            Свежие примерки, сделанные пользователями
          </p>
        </div>

        {loading && <p className="text-sm text-neutral-400">Загрузка...</p>}
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}
        {!loading && !error && items.length === 0 && (
          <p className="text-sm text-neutral-400">Пока нет примеров.</p>
        )}

        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => openPreview(item)}
              className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] text-left backdrop-blur transition hover:border-white/25"
            >
              <img
                src={toMediaUrl(item.result_url)}
                alt="Пример примерки"
                className="aspect-square w-full object-cover transition group-hover:scale-105"
                loading="lazy"
              />
              <div className="flex items-center justify-between p-3 text-xs text-neutral-400">
                <span>{formatDate(item.created_at)}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${
                    item.source === 'web'
                      ? 'bg-sky-500/15 text-sky-300'
                      : 'bg-emerald-500/15 text-emerald-300'
                  }`}
                >
                  {item.source || 'web'}
                </span>
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

async function fetchGalleryItems() {
  try {
    const data = await fetchEdgeJson('/api/gallery')
    return { data, error: null }
  } catch {
    const result = await supabase
      .from('generations')
      .select('id, car_url, wheel_url, result_url, source, created_at')
      .not('result_url', 'is', null)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE)
    return { data: result.data, error: result.error }
  }
}
