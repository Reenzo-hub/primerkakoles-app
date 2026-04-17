import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout.jsx'
import PhotoUpload from '../components/PhotoUpload.jsx'
import GenerationResult from '../components/GenerationResult.jsx'
import TelegramLogin from '../components/TelegramLogin.jsx'
import { useAuth } from '../context/AuthContext.jsx'

const GENERATE_WEBHOOK_URL = import.meta.env.VITE_GENERATE_WEBHOOK_URL

const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const raw = reader.result
      const base64 = typeof raw === 'string' ? raw.split(',')[1] : ''
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

export default function HomePage() {
  const { user, refreshBalance, decrementBalance } = useAuth()
  const [carPhoto, setCarPhoto] = useState(null)
  const [wheelPhoto, setWheelPhoto] = useState(null)
  const [resultUrl, setResultUrl] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)

  useEffect(() => {
    if (user) refreshBalance()
  }, [user, refreshBalance])

  useEffect(() => {
    return () => {
      if (resultUrl) URL.revokeObjectURL(resultUrl)
    }
  }, [resultUrl])

  const canGenerate =
    !!carPhoto && !!wheelPhoto && !generating && (user?.generations_left ?? 0) > 0

  const handleGenerate = useCallback(async () => {
    if (!canGenerate) return
    setGenerating(true)
    setErrorMsg(null)
    setResultUrl(null)
    try {
      const [car_base64, wheel_base64] = await Promise.all([
        fileToBase64(carPhoto.file),
        fileToBase64(wheelPhoto.file),
      ])

      const res = await fetch(GENERATE_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          car_base64,
          wheel_base64,
          car_mime: carPhoto.file.type,
          wheel_mime: wheelPhoto.file.type,
          chat_id: user?.chat_id,
        }),
      })

      if (!res.ok) throw new Error(`Ошибка генерации: ${res.status}`)

      const blob = await res.blob()
      if (!blob.type.startsWith('image/')) {
        const text = await blob.text().catch(() => '')
        throw new Error(text || 'Сервер вернул не изображение')
      }
      const url = URL.createObjectURL(blob)
      setResultUrl(url)
      decrementBalance()
      refreshBalance()
    } catch (e) {
      setErrorMsg(e.message || 'Что-то пошло не так')
    } finally {
      setGenerating(false)
    }
  }, [canGenerate, carPhoto, wheelPhoto, user?.chat_id, decrementBalance, refreshBalance])

  const tryAnotherWheel = () => {
    if (wheelPhoto?.preview) URL.revokeObjectURL(wheelPhoto.preview)
    setWheelPhoto(null)
    setResultUrl(null)
  }

  const tryAnotherCar = () => {
    if (carPhoto?.preview) URL.revokeObjectURL(carPhoto.preview)
    setCarPhoto(null)
    setResultUrl(null)
  }

  if (!user) {
    return (
      <Layout
        showAuthBar={false}
        headerRight={
          <a
            href="https://t.me/primerkakoles_bot"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden text-sm font-medium text-neutral-300 transition hover:text-white sm:inline"
          >
            Telegram-бот →
          </a>
        }
      >
        <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-neutral-300 backdrop-blur">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-500" />
            </span>
            Запуск уже близко
          </div>

          <h1 className="mb-4 bg-gradient-to-b from-white to-neutral-400 bg-clip-text text-5xl font-black tracking-tight text-transparent sm:text-7xl">
            Примерка Колёс
          </h1>

          <p className="mb-10 max-w-xl text-base text-neutral-400 sm:text-lg">
            Виртуальная примерка дисков на ваш автомобиль
          </p>

          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur">
            <h2 className="mb-4 text-lg font-semibold">Войдите, чтобы начать</h2>
            <TelegramLogin />
            <div className="mt-6 border-t border-white/10 pt-4 text-xs text-neutral-500">
              или войти по email (скоро)
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  const outOfBalance = (user.generations_left ?? 0) <= 0

  return (
    <Layout>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {resultUrl ? (
          <GenerationResult
            url={resultUrl}
            onTryAnotherWheel={tryAnotherWheel}
            onTryAnotherCar={tryAnotherCar}
          />
        ) : (
          <>
            <div className="mb-8 text-center sm:text-left">
              <h1 className="bg-gradient-to-b from-white to-neutral-400 bg-clip-text text-3xl font-black tracking-tight text-transparent sm:text-5xl">
                Загрузите фото
              </h1>
              <p className="mt-2 text-sm text-neutral-400 sm:text-base">
                Авто и диск — мы примерим их друг к другу
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <PhotoUpload
                label="Фото автомобиля"
                hint="Сбоку, при хорошем освещении"
                value={carPhoto}
                onChange={setCarPhoto}
              />
              <PhotoUpload
                label="Фото диска"
                hint="Фронтально, без посторонних предметов"
                value={wheelPhoto}
                onChange={setWheelPhoto}
              />
            </div>

            {generating && (
              <div className="mt-6 flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur">
                <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
                <span className="text-sm text-neutral-300">
                  Генерация... ~30–60 секунд
                </span>
              </div>
            )}

            {errorMsg && (
              <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
                {errorMsg}
              </div>
            )}

            <div className="mt-10 flex flex-col items-center gap-3">
              <button
                onClick={handleGenerate}
                disabled={!canGenerate}
                className="group inline-flex w-full max-w-xs items-center justify-center gap-3 rounded-full bg-white px-8 py-4 text-base font-semibold text-neutral-950 shadow-[0_0_40px_rgba(255,255,255,0.15)] transition hover:bg-orange-500 hover:text-white hover:shadow-[0_0_60px_rgba(249,115,22,0.45)] disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-500 disabled:shadow-none sm:text-lg"
              >
                {generating ? 'Генерация...' : 'Примерить'}
                {!generating && (
                  <span className="transition group-hover:translate-x-1">→</span>
                )}
              </button>
              {outOfBalance && (
                <p className="text-sm text-neutral-400">
                  Купите генерации чтобы продолжить
                </p>
              )}
              <Link
                to="/history"
                className="mt-2 text-xs text-neutral-500 underline-offset-4 transition hover:text-neutral-300 hover:underline"
              >
                Посмотреть мою историю →
              </Link>
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}
