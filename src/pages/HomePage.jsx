import { Link } from 'react-router-dom'
import Layout from '../components/Layout.jsx'
import { useSeo } from '../lib/useSeo.js'

export default function HomePage() {
  useSeo({
    title: 'Примерить диски онлайн с помощью искусственного интеллекта',
    description:
      'Виртуальная примерка дисков на ваш автомобиль с помощью ИИ. Загрузите фото машины и фото диска — получите результат за минуту. Бесплатно, без регистрации и установки.',
  })
  return (
    <Layout>
      <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
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

        <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
          <Link
            to="/try"
            className="group inline-flex items-center justify-center gap-3 rounded-full bg-white px-8 py-4 text-base font-semibold text-neutral-950 shadow-[0_0_40px_rgba(255,255,255,0.15)] transition hover:bg-orange-500 hover:text-white hover:shadow-[0_0_60px_rgba(249,115,22,0.45)] sm:text-lg"
          >
            Примерить диски
            <span className="transition group-hover:translate-x-1">→</span>
          </Link>
          <Link
            to="/gallery"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 px-8 py-4 text-base font-medium text-neutral-200 backdrop-blur transition hover:bg-white/5 hover:text-white sm:text-lg"
          >
            Примеры
          </Link>
        </div>

        <a
          href="https://t.me/primerkakoles_bot"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-10 text-sm text-neutral-500 underline-offset-4 transition hover:text-neutral-300 hover:underline"
        >
          Или открыть в Telegram →
        </a>
      </div>
    </Layout>
  )
}
