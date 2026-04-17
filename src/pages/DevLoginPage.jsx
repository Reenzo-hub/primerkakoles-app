import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { supabase } from '../lib/supabase.js'

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'primerkakoles2025'

export default function DevLoginPage() {
  const navigate = useNavigate()
  const { loginAsDev } = useAuth()

  const [password, setPassword] = useState('')
  const [chatId, setChatId] = useState('')
  const [firstName, setFirstName] = useState('Админ')
  const [username, setUsername] = useState('admin')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (password !== ADMIN_PASSWORD) {
      setError('Неверный пароль')
      return
    }

    const parsedChatId = Number(chatId)
    if (!parsedChatId || Number.isNaN(parsedChatId)) {
      setError('Укажите корректный chat_id (число)')
      return
    }

    setLoading(true)
    try {
      const { data, error: err } = await supabase
        .from('users')
        .select('id, chat_id, username, first_name, generations_left, email')
        .eq('chat_id', parsedChatId)
        .maybeSingle()

      if (err) throw err

      loginAsDev({
        id: data?.id ?? null,
        chat_id: parsedChatId,
        username: data?.username || username || null,
        first_name: data?.first_name || firstName || 'Админ',
        generations_left: data?.generations_left ?? 10,
        email: data?.email ?? null,
      })

      navigate('/')
    } catch (e) {
      setError(e.message || 'Ошибка входа')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout showAuthBar={false}>
      <div className="mx-auto flex max-w-md flex-col items-center justify-center px-4 py-12 sm:px-6">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-1.5 text-xs font-medium text-orange-300">
          Dev-вход · только для тестирования
        </div>

        <h1 className="mb-2 text-3xl font-black tracking-tight sm:text-4xl">
          Войти как пользователь
        </h1>
        <p className="mb-8 text-center text-sm text-neutral-400">
          Укажите chat_id — если такой пользователь уже есть в базе, подтянем его данные.
          Иначе — залогинит под переданными значениями.
        </p>

        <form
          onSubmit={handleSubmit}
          className="w-full space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur"
        >
          <Field label="Пароль" type="password" value={password} onChange={setPassword} autoFocus />
          <Field
            label="chat_id (Telegram user id)"
            value={chatId}
            onChange={setChatId}
            placeholder="например 123456789"
            inputMode="numeric"
          />
          <Field label="Имя" value={firstName} onChange={setFirstName} />
          <Field label="username" value={username} onChange={setUsername} />

          {error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="group mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-base font-semibold text-neutral-950 transition hover:bg-orange-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Вход...' : 'Войти'}
            {!loading && <span className="transition group-hover:translate-x-1">→</span>}
          </button>
        </form>
      </div>
    </Layout>
  )
}

function Field({ label, value, onChange, type = 'text', ...rest }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-neutral-400">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-white/10 bg-black/40 px-4 py-2.5 text-white outline-none ring-orange-500/40 focus:ring-2"
        {...rest}
      />
    </label>
  )
}
