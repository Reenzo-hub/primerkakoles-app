import { useCallback, useRef, useState } from 'react'

export default function PhotoUpload({ label, hint, value, onChange }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  const handleFile = useCallback(
    (file) => {
      if (!file) return
      if (!file.type.startsWith('image/')) {
        alert('Нужно загрузить изображение')
        return
      }
      const preview = URL.createObjectURL(file)
      onChange({ file, preview })
    },
    [onChange],
  )

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    handleFile(file)
  }

  const clear = (e) => {
    e.stopPropagation()
    if (value?.preview) URL.revokeObjectURL(value.preview)
    onChange(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={`group relative flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition ${
        dragging
          ? 'border-orange-500 bg-orange-500/5'
          : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {value?.preview ? (
        <>
          <img
            src={value.preview}
            alt={label}
            className="max-h-56 w-auto rounded-lg object-contain"
          />
          <button
            onClick={clear}
            className="absolute right-3 top-3 rounded-full bg-black/70 px-3 py-1 text-xs text-white ring-1 ring-white/20 transition hover:bg-black"
          >
            Убрать
          </button>
          <p className="mt-3 text-xs text-neutral-400">{value.file?.name}</p>
        </>
      ) : (
        <>
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/5">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6 text-neutral-300"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <p className="font-medium text-white">{label}</p>
          <p className="mt-1 text-xs text-neutral-400">
            {hint || 'Перетащите сюда или нажмите чтобы выбрать'}
          </p>
        </>
      )}
    </div>
  )
}
