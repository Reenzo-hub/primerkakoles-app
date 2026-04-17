import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function Layout({ children, showAuthBar = true, headerRight = null }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-neutral-950 text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-40 h-[28rem] w-[28rem] rounded-full bg-orange-500/20 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-[32rem] w-[32rem] rounded-full bg-sky-500/10 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 px-6 py-6 sm:px-10">
          <Link
            to="/"
            className="flex items-center gap-2 text-sm font-medium tracking-widest text-neutral-400 uppercase transition hover:text-white"
          >
            <span className="inline-block h-2 w-2 rounded-full bg-orange-500" />
            primerkakoles
          </Link>

          <div className="flex flex-wrap items-center gap-2 text-sm">
            {headerRight}
            {showAuthBar && user ? (
              <>
                <span className="hidden text-neutral-400 sm:inline">
                  Привет,{' '}
                  <span className="font-medium text-white">
                    {user.first_name || user.username || 'друг'}
                  </span>
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-neutral-200 backdrop-blur">
                  Осталось:{' '}
                  <span className="font-semibold text-orange-400">
                    {user.generations_left ?? 0}
                  </span>
                </span>
                <button
                  onClick={() => alert('Скоро!')}
                  className="rounded-full bg-orange-500/10 px-3 py-1.5 text-orange-300 ring-1 ring-inset ring-orange-500/30 transition hover:bg-orange-500/20"
                >
                  Купить ещё
                </button>
                <Link
                  to="/history"
                  className="rounded-full border border-white/10 px-3 py-1.5 text-neutral-200 backdrop-blur transition hover:bg-white/5"
                >
                  История
                </Link>
                <button
                  onClick={handleLogout}
                  className="rounded-full border border-white/10 px-3 py-1.5 text-neutral-400 backdrop-blur transition hover:bg-white/5 hover:text-white"
                >
                  Выйти
                </button>
              </>
            ) : null}
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="px-6 py-6 text-center text-xs text-neutral-500 sm:px-10">
          © 2025 Примерка Колёс
        </footer>
      </div>
    </div>
  )
}
