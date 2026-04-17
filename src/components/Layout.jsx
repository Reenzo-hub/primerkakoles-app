import { NavLink, Link } from 'react-router-dom'

export default function Layout({ children }) {
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
            <NavItem to="/gallery">Примеры</NavItem>
            <a
              href="https://t.me/primerkakoles_bot"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden rounded-full px-3 py-1.5 text-neutral-400 transition hover:text-white sm:inline"
            >
              Telegram-бот →
            </a>
          </nav>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="px-6 py-6 text-center text-xs text-neutral-500 sm:px-10">
          © 2025 Примерка Колёс
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
