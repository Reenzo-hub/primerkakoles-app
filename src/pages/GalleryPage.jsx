import { useEffect, useState } from 'react'
import Layout from '../components/Layout.jsx'
import { supabase } from '../lib/supabase.js'

const BUCKET = 'Generations'
const FOLDER = 'web'
const PAGE_SIZE = 200

export default function GalleryPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [preview, setPreview] = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      const { data, error: err } = await supabase.storage
        .from(BUCKET)
        .list(FOLDER, {
          limit: PAGE_SIZE,
          sortBy: { column: 'created_at', order: 'desc' },
        })

      if (cancelled) return
      if (err) {
        setError(err.message)
        setLoading(false)
        return
      }

      setItems(groupByTimestamp(data || []))
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [])

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
              onClick={() => setPreview(item)}
              className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] text-left backdrop-blur transition hover:border-white/25"
            >
              <img
                src={item.result_url}
                alt="Пример примерки"
                className="aspect-square w-full object-cover transition group-hover:scale-105"
                loading="lazy"
              />
              <div className="flex items-center justify-between p-3 text-xs text-neutral-400">
                <span>{formatDate(item.created_at)}</span>
                <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-sky-300">
                  web
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {preview && (
        <div
          onClick={() => setPreview(null)}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/90 p-4"
        >
          <img
            src={preview.result_url}
            alt="full"
            className="max-h-[80vh] max-w-full rounded-xl"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="flex gap-3 text-xs text-neutral-300">
            {preview.car_url && (
              <a
                href={preview.car_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 hover:bg-white/10"
              >
                Авто
              </a>
            )}
            {preview.wheel_url && (
              <a
                href={preview.wheel_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 hover:bg-white/10"
              >
                Диск
              </a>
            )}
          </div>
        </div>
      )}
    </Layout>
  )
}

function groupByTimestamp(files) {
  const groups = new Map()

  for (const f of files) {
    const match = f.name.match(/^(\d+)_(car|wheel|result)\.(jpg|jpeg|png|webp)$/i)
    if (!match) continue
    const [, ts, kind] = match

    if (!groups.has(ts)) {
      groups.set(ts, { id: ts, created_at: f.created_at || null })
    }
    const entry = groups.get(ts)
    entry[`${kind.toLowerCase()}_url`] = publicUrl(f.name)

    if (!entry.created_at && f.created_at) entry.created_at = f.created_at
  }

  return Array.from(groups.values())
    .filter((g) => g.result_url)
    .sort((a, b) => Number(b.id) - Number(a.id))
}

function publicUrl(name) {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(`${FOLDER}/${name}`)
  return data?.publicUrl || ''
}

function formatDate(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('ru-RU')
  } catch {
    return iso
  }
}
