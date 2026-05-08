import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout.jsx'
import PhotoUpload from '../components/PhotoUpload.jsx'
import GenerationResult from '../components/GenerationResult.jsx'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../lib/useAuth.js'
import { useUserProfile } from '../lib/useUserProfile.js'
import { useSeo } from '../lib/useSeo.js'

const WEBHOOK_URL = import.meta.env.VITE_WEBHOOK_URL

const TIMEOUT_MS = 120_000

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

export default function TryPage() {
  useSeo({
    title:
      'Примерить диски онлайн — загрузите фото авто и диска · Примерка Колёс',
    description:
      'Загрузите фото вашего автомобиля и понравившегося диска — искусственный интеллект покажет, как они будут смотреться вместе. Генерация занимает 30–60 секунд.',
  })

  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const { profile, refetch: refetchProfile } = useUserProfile(user)

  const [carPhoto, setCarPhoto] = useState(null)
  const [wheelPhoto, setWheelPhoto] = useState(null)
  const [resultUrl, setResultUrl] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)

  useEffect(() => {
    return () => {
      if (resultUrl) URL.revokeObjectURL(resultUrl)
    }
  }, [resultUrl])

  const used = profile?.generations_used ?? 0
  const limit = profile?.generations_limit ?? 0
  const left = Math.max(0, limit - used)
  const canGenerate =
    !!carPhoto && !!wheelPhoto && !generating && !!user && left > 0

  const handleGenerate = useCallback(async () => {
    if (!canGenerate) return
    setGenerating(true)
    setErrorMsg(null)
    setResultUrl(null)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token
      if (!token) throw new Error('Нет активной сессии. Войдите заново.')

      const [car_base64, wheel_base64] = await Promise.all([
        fileToBase64(carPhoto.file),
        fileToBase64(wheelPhoto.file),
      ])

      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

      let res
      try {
        res = await fetch(WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
          body: JSON.stringify({
            car_base64,
            wheel_base64,
            car_mime: carPhoto.file.type,
            wheel_mime: wheelPhoto.file.type,
          }),
        })
      } finally {
        clearTimeout(timer)
      }

      if (res.status === 401) throw new Error('Сессия истекла. Войдите заново.')
      if (res.status === 402)
        throw new Error('Баланс генераций исчерпан. Пополните в кабинете.')
      if (!res.ok) throw new Error(`Ошибка генерации: ${res.status}`)

      const blob = await res.blob()
      if (!blob.type.startsWith('image/')) {
        const text = await blob.text().catch(() => '')
        throw new Error(text || 'Сервер вернул не изображение')
      }
      const url = URL.createObjectURL(blob)
      setResultUrl(url)
      refetchProfile()
    } catch (e) {
      if (e.name === 'AbortError') {
        setErrorMsg('Превышено время ожидания (120 сек). Попробуйте ещё раз.')
      } else {
        setErrorMsg(e.message || 'Что-то пошло не так')
      }
    } finally {
      setGenerating(false)
    }
  }, [canGenerate, carPhoto, wheelPhoto, refetchProfile])

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

  if (authLoading) {
    return (
      <Layout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
        </div>
      </Layout>
    )
  }

  if (!user) {
    return (
      <Layout>
        <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center backdrop-blur">
            <h1 className="bg-gradient-to-b from-white to-neutral-400 bg-clip-text text-2xl font-black tracking-tight text-transparent">
              Войдите, чтобы примерить
            </h1>
            <p className="mt-3 text-sm text-neutral-400">
              Зарегистрируйтесь через email, чтобы открыть кабинет и сохранять примерки.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-orange-500 hover:text-white"
            >
              Войти →
            </button>
          </div>
        </div>
      </Layout>
    )
  }

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
            <div className="mb-8 flex flex-col gap-3 text-center sm:flex-row sm:items-end sm:justify-between sm:text-left">
              <div>
                <h1 className="bg-gradient-to-b from-white to-neutral-400 bg-clip-text text-3xl font-black tracking-tight text-transparent sm:text-5xl">
                  Примерить диски
                </h1>
                <p className="mt-2 text-sm text-neutral-400 sm:text-base">
                  Загрузите фото авто и диска — мы примерим их друг к другу
                </p>
              </div>
              <div className="inline-flex items-center gap-2 self-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-neutral-300 sm:self-auto">
                Осталось генераций:{' '}
                <span className="font-semibold text-white">{left}</span>
                <span className="text-neutral-500">из {limit}</span>
              </div>
            </div>

            {left === 0 && (
              <div className="mb-6 rounded-2xl border border-orange-500/30 bg-orange-500/10 p-4 text-sm text-orange-200">
                Баланс генераций исчерпан.{' '}
                <Link to="/cabinet/buy" className="underline hover:text-white">
                  Купить генерации →
                </Link>
              </div>
            )}

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
                  <span className="transition group-hover:translate-x-1">
                    →
                  </span>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}
