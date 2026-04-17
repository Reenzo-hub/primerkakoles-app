import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function Header() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleBuy = () => alert('Скоро!')
  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <header className="border-b border-white/5 bg-neutral-950/70 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <Link to="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <span className="inline-block h-2 w-2 rounded-full bg-orange-500" />
          Примерка Колёс
        </Link>

        {user && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="hidden text-neutral-400 sm:inline">
              Привет,{' '}
              <span className="font-medium text-white">
                {user.first_name || user.username || 'друг'}
              </span>
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-neutral-200">
              Осталось:{' '}
              <span className="font-semibold text-orange-400">{user.generations_left ?? 0}</span>
            </span>
            <button
              onClick={handleBuy}
              className="rounded-full bg-orange-500/10 px-3 py-1 text-orange-300 ring-1 ring-inset ring-orange-500/30 transition hover:bg-orange-500/20"
            >
              Купить ещё
            </button>
            <Link
              to="/history"
              className="rounded-full border border-white/10 px-3 py-1 text-neutral-200 transition hover:bg-white/5"
            >
              История
            </Link>
            <button
              onClick={handleLogout}
              className="rounded-full border border-white/10 px-3 py-1 text-neutral-400 transition hover:bg-white/5 hover:text-white"
            >
              Выйти
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
