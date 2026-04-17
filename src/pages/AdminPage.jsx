import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'primerkakoles2025'
const SESSION_KEY = 'primerkakoles.admin'
const PAGE_SIZE = 20

export default function AdminPage() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem(SESSION_KEY) === '1')
  const [password, setPassword] = useState('')
  const [pwError, setPwError] = useState(null)

  const [items, setItems] = useState([])
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [preview, setPreview] = useState(null)

  const load = useCallback(async (pageIdx) => {
    setLoading(true)
    setError(null)
    const from = pageIdx * PAGE_SIZE
    const to = from + PAGE_SIZE - 1
    const { data, error: err, count } = await supabase
      .from('generations')
      .select('id, user_id, car_url, wheel_url, result_url, source, created_at', {
        count: 'exact',
      })
      .order('created_at', { ascending: false })
      .range(from, to)
    if (err) setError(err.message)
    setItems(data || [])
    setTotal(count || 0)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (authed) load(page)
  }, [authed, page, load])

  const submitPassword = (e) => {
    e.preventDefault()
    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, '1')
      setAuthed(true)
      setPwError(null)
    } else {
      setPwError('Неверный пароль')
    }
  }

  const logout = () => {
    sessionStorage.removeItem(SESSION_KEY)
    setAuthed(false)
    setPassword('')
  }

  if (!authed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-4 text-white">
        <form
          onSubmit={submitPassword}
          className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.02] p-6"
        >
          <h1 className="mb-2 text-xl font-bold">Админка</h1>
          <p className="mb-4 text-sm text-neutral-400">Введите пароль для доступа</p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mb-3 w-full rounded-lg border border-white/10 bg-black/40 px-4 py-2.5 text-white outline-none ring-orange-500/40 focus:ring-2"
            placeholder="Пароль"
            autoFocus
          />
          {pwError && <p className="mb-3 text-sm text-red-400">{pwError}</p>}
          <button
            type="submit"
            className="w-full rounded-lg bg-orange-500 px-4 py-2.5 font-semibold text-white transition hover:bg-orange-400"
          >
            Войти
          </button>
        </form>
      </div>
    )
  }

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <header className="border-b border-white/5 bg-neutral-950/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <h1 className="text-lg font-bold">Админка · Все генерации</h1>
          <button
            onClick={logout}
            className="rounded-full border border-white/10 px-3 py-1 text-sm text-neutral-300 transition hover:bg-white/5"
          >
            Выйти
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {loading && <p className="text-sm text-neutral-400">Загрузка...</p>}
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5 text-xs uppercase tracking-wider text-neutral-400">
                <tr>
                  <th className="px-4 py-3">Дата</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Авто</th>
                  <th className="px-4 py-3">Диск</th>
                  <th className="px-4 py-3">Результат</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-t border-white/5">
                    <td className="px-4 py-3 whitespace-nowrap text-neutral-300">
                      {formatDate(item.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          item.source === 'web'
                            ? 'bg-sky-500/20 text-sky-300'
                            : 'bg-emerald-500/20 text-emerald-300'
                        }`}
                      >
                        {item.source}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-neutral-400">{item.user_id}</td>
                    <td className="px-4 py-3">{thumb(item.car_url, setPreview)}</td>
                    <td className="px-4 py-3">{thumb(item.wheel_url, setPreview)}</td>
                    <td className="px-4 py-3">{thumb(item.result_url, setPreview)}</td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-neutral-500">
                      Нет данных
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {total > 0 && (
          <div className="mt-4 flex items-center justify-between text-sm text-neutral-400">
            <span>
              Страница {page + 1} из {pageCount} · всего {total}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="rounded-lg border border-white/10 px-3 py-1.5 text-neutral-200 transition hover:bg-white/5 disabled:opacity-40"
              >
                ← Назад
              </button>
              <button
                disabled={page + 1 >= pageCount}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-white/10 px-3 py-1.5 text-neutral-200 transition hover:bg-white/5 disabled:opacity-40"
              >
                Вперёд →
              </button>
            </div>
          </div>
        )}
      </main>

      {preview && (
        <div
          onClick={() => setPreview(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
        >
          <img src={preview} alt="full" className="max-h-[90vh] max-w-full rounded-xl" />
        </div>
      )}
    </div>
  )
}

function thumb(url, onOpen) {
  if (!url) return <span className="text-neutral-600">—</span>
  return (
    <button onClick={() => onOpen(url)} className="block">
      <img
        src={url}
        alt=""
        className="h-16 w-16 rounded-lg object-cover ring-1 ring-white/10 transition hover:ring-orange-500/50"
      />
    </button>
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
