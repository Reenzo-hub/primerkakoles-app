import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import Header from '../components/Header.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { supabase } from '../lib/supabase.js'

export default function HistoryPage() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [preview, setPreview] = useState(null)

  useEffect(() => {
    if (!user?.chat_id) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      const { data: userRow } = await supabase
        .from('users')
        .select('id')
        .eq('chat_id', user.chat_id)
        .maybeSingle()

      const userId = userRow?.id ?? user.id
      if (!userId) {
        if (!cancelled) {
          setItems([])
          setLoading(false)
        }
        return
      }

      const { data, error: err } = await supabase
        .from('generations')
        .select('id, car_url, wheel_url, result_url, source, created_at')
        .eq('user_id', userId)
        .eq('source', 'web')
        .order('created_at', { ascending: false })
        .limit(100)

      if (cancelled) return
      if (err) setError(err.message)
      setItems(data || [])
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [user?.chat_id, user?.id])

  if (!user) return <Navigate to="/" replace />

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <h1 className="mb-6 text-2xl font-bold sm:text-3xl">История примерок</h1>

        {loading && <p className="text-sm text-neutral-400">Загрузка...</p>}
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}
        {!loading && !error && items.length === 0 && (
          <p className="text-sm text-neutral-400">Пока нет примерок — создайте первую!</p>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => setPreview(item.result_url)}
              className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] text-left transition hover:border-white/20"
            >
              {item.result_url ? (
                <img
                  src={item.result_url}
                  alt="result"
                  className="aspect-square w-full object-cover transition group-hover:scale-105"
                />
              ) : (
                <div className="flex aspect-square w-full items-center justify-center text-xs text-neutral-500">
                  Нет превью
                </div>
              )}
              <div className="p-3 text-xs text-neutral-400">{formatDate(item.created_at)}</div>
            </button>
          ))}
        </div>
      </main>

      {preview && (
        <div
          onClick={() => setPreview(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
        >
          <img src={preview} alt="full" className="max-h-[90vh] max-w-full rounded-xl" />
        </div>
      )}

      <footer className="mx-auto max-w-5xl px-6 py-8 text-center text-xs text-neutral-500">
        © 2025 Примерка Колёс
      </footer>
    </div>
  )
}

function formatDate(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleString('ru-RU')
  } catch {
    return iso
  }
}
