import { useCallback, useEffect, useState } from 'react'
import Header from '../components/Header.jsx'
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
      <div className="min-h-screen bg-neutral-950 text-white">
        <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 py-12 text-center">
          <h1 className="mb-3 text-4xl font-black tracking-tight sm:text-5xl">Примерка Колёс</h1>
          <p className="mb-10 text-neutral-400">
            Виртуальная примерка дисков на ваш автомобиль
          </p>

          <div className="w-full rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <h2 className="mb-4 text-lg font-semibold">Войдите, чтобы начать</h2>
            <TelegramLogin />
            <div className="mt-6 border-t border-white/10 pt-4 text-xs text-neutral-500">
              или войти по email (скоро)
            </div>
          </div>
          <footer className="mt-10 text-xs text-neutral-500">© 2025 Примерка Колёс</footer>
        </div>
      </div>
    )
  }

  const outOfBalance = (user.generations_left ?? 0) <= 0

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {resultUrl ? (
          <GenerationResult
            url={resultUrl}
            onTryAnotherWheel={tryAnotherWheel}
            onTryAnotherCar={tryAnotherCar}
          />
        ) : (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-bold sm:text-3xl">Загрузите фото</h1>
              <p className="mt-1 text-sm text-neutral-400">
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
              <div className="mt-6 flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
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

            <div className="mt-8 flex flex-col items-center gap-3">
              <button
                onClick={handleGenerate}
                disabled={!canGenerate}
                className="w-full max-w-xs rounded-full bg-orange-500 px-8 py-4 text-base font-semibold text-white shadow-[0_0_40px_rgba(249,115,22,0.35)] transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-500 disabled:shadow-none sm:text-lg"
              >
                {generating ? 'Генерация...' : 'Примерить'}
              </button>
              {outOfBalance && (
                <p className="text-sm text-neutral-400">
                  Купите генерации чтобы продолжить
                </p>
              )}
            </div>
          </>
        )}
      </main>
      <footer className="mx-auto max-w-5xl px-6 py-8 text-center text-xs text-neutral-500">
        © 2025 Примерка Колёс
      </footer>
    </div>
  )
}
