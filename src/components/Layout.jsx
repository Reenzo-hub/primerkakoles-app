import { NavLink, Link } from 'react-router-dom'
import { useAuth } from '../lib/useAuth.js'

export default function Layout({ children }) {
  const { user } = useAuth()
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

          <nav className="flex flex-wrap items-center gap-1 text-sm sm:gap-2">
            <NavItem to="/try">Примерить диски</NavItem>
            {user && <NavItem to="/my">Мои примерки</NavItem>}
            {user ? (
              <NavItem to="/cabinet">Кабинет</NavItem>
            ) : (
              <NavItem to="/login">Войти</NavItem>
            )}
          </nav>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="border-t border-white/5 px-6 py-10 sm:px-10">
          <div className="mx-auto grid max-w-6xl gap-8 sm:grid-cols-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium tracking-widest text-neutral-400 uppercase">
                <span className="inline-block h-2 w-2 rounded-full bg-orange-500" />
                primerkakoles
              </div>
              <p className="mt-3 text-xs text-neutral-500">
                Виртуальная примерка дисков на ваш автомобиль.
              </p>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Навигация
              </h3>
              <ul className="mt-3 flex flex-col gap-2 text-sm">
                <FooterLink to="/try">Примерить диски</FooterLink>
                <FooterLink to="/gallery">Примеры</FooterLink>
                {user && <FooterLink to="/my">Мои примерки</FooterLink>}
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Контакты
              </h3>
              <ul className="mt-3 flex flex-col gap-2 text-sm">
                <li>
                  <a
                    href="https://t.me/primerkakoles_bot"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-neutral-300 transition hover:text-white"
                  >
                    Telegram-бот →
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mx-auto mt-10 max-w-6xl border-t border-white/5 pt-6 text-center text-xs text-neutral-500">
            © 2026 Примерка Колёс
          </div>
        </footer>
      </div>
    </div>
  )
}

function NavItem({ to, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `rounded-full px-3 py-1.5 transition backdrop-blur ${
          isActive
            ? 'border border-white/15 bg-white/10 text-white'
            : 'border border-transparent text-neutral-300 hover:bg-white/5 hover:text-white'
        }`
      }
    >
      {children}
    </NavLink>
  )
}

function FooterLink({ to, children }) {
  return (
    <li>
      <NavLink
        to={to}
        className="text-neutral-300 transition hover:text-white"
      >
        {children}
      </NavLink>
    </li>
  )
}
