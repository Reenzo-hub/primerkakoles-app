export default function GenerationResult({ url, onTryAnotherWheel, onTryAnotherCar }) {
  const handleDownload = () => {
    const a = document.createElement('a')
    a.href = url
    a.download = `primerkakoles-${Date.now()}.png`
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  return (
    <div className="flex flex-col items-center gap-5 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
      <img src={url} alt="Результат" className="max-h-[70vh] w-auto rounded-xl object-contain" />
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={handleDownload}
          className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-neutral-950 transition hover:bg-orange-500 hover:text-white"
        >
          Скачать
        </button>
        <button
          onClick={onTryAnotherWheel}
          className="rounded-full border border-white/15 px-5 py-2.5 text-sm font-medium text-neutral-200 transition hover:bg-white/5"
        >
          Попробовать другой диск
        </button>
        <button
          onClick={onTryAnotherCar}
          className="rounded-full border border-white/15 px-5 py-2.5 text-sm font-medium text-neutral-200 transition hover:bg-white/5"
        >
          Попробовать другое авто
        </button>
      </div>
    </div>
  )
}
