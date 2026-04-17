export default function ComingSoon() {
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
        <header className="flex items-center justify-between px-6 py-6 sm:px-10">
          <div className="flex items-center gap-2 text-sm font-medium tracking-widest text-neutral-400 uppercase">
            <span className="inline-block h-2 w-2 rounded-full bg-orange-500" />
            primerkakoles
          </div>
          <a
            href="https://t.me/primerkakoles_bot"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden text-sm font-medium text-neutral-300 transition hover:text-white sm:inline"
          >
            Telegram-бот →
          </a>
        </header>

        <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-neutral-300 backdrop-blur">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-500" />
            </span>
            Запуск уже близко
          </div>

          <h1 className="mb-4 bg-gradient-to-b from-white to-neutral-400 bg-clip-text text-5xl font-black tracking-tight text-transparent sm:text-7xl md:text-8xl">
            Примерка Колёс
          </h1>

          <p className="mb-10 max-w-xl text-base text-neutral-400 sm:text-lg">
            Виртуальная примерка дисков на ваш автомобиль
          </p>

          <p className="mb-10 text-2xl font-semibold tracking-tight text-white sm:text-4xl">
            Скоро открытие
          </p>

          <a
            href="https://t.me/primerkakoles_bot"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-3 rounded-full bg-white px-8 py-4 text-base font-semibold text-neutral-950 shadow-[0_0_40px_rgba(255,255,255,0.15)] transition hover:bg-orange-500 hover:text-white hover:shadow-[0_0_60px_rgba(249,115,22,0.45)] sm:text-lg"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z" />
            </svg>
            Попробовать в Telegram
            <span className="transition group-hover:translate-x-1">→</span>
          </a>
        </main>

        <footer className="px-6 py-6 text-center text-xs text-neutral-500 sm:px-10">
          © 2025 Примерка Колёс
        </footer>
      </div>
    </div>
  )
}
