import Layout from '../components/Layout.jsx'
import { useSeo } from '../lib/useSeo.js'

const SUPPORT_EMAIL = 'support@primerkakoles.ru'

export default function SupportPage() {
  useSeo({
    title: 'Поддержка · Примерка Колёс',
    description:
      'Свяжитесь с поддержкой Примерки Колёс по вопросам доступа к кабинету и работы сервиса.',
  })

  return (
    <Layout>
      <div className="mx-auto max-w-xl px-4 py-16 sm:px-6">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center backdrop-blur">
          <h1 className="bg-gradient-to-b from-white to-neutral-400 bg-clip-text text-3xl font-black tracking-tight text-transparent">
            Поддержка
          </h1>
          <p className="mt-3 text-sm text-neutral-400">
            Если не получается войти в кабинет или нужно восстановить доступ,
            напишите нам на email.
          </p>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="mt-6 inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-orange-500 hover:text-white"
          >
            {SUPPORT_EMAIL}
          </a>
        </div>
      </div>
    </Layout>
  )
}
