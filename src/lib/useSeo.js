import { useEffect } from 'react'

const DEFAULT_TITLE = 'Примерить диски онлайн с помощью искусственного интеллекта'
const DEFAULT_DESCRIPTION =
  'Виртуальная примерка дисков на ваш автомобиль с помощью ИИ. Загрузите фото машины и фото диска — получите результат за минуту. Бесплатно, без регистрации и установки.'

export function useSeo({ title, description } = {}) {
  useEffect(() => {
    const prevTitle = document.title
    document.title = title || DEFAULT_TITLE

    const desc = description || DEFAULT_DESCRIPTION
    const meta = ensureMeta('description')
    const prevDesc = meta.getAttribute('content')
    meta.setAttribute('content', desc)

    const ogTitle = ensureMeta(null, 'og:title')
    const prevOgTitle = ogTitle.getAttribute('content')
    ogTitle.setAttribute('content', title || DEFAULT_TITLE)

    const ogDesc = ensureMeta(null, 'og:description')
    const prevOgDesc = ogDesc.getAttribute('content')
    ogDesc.setAttribute('content', desc)

    return () => {
      document.title = prevTitle
      if (prevDesc != null) meta.setAttribute('content', prevDesc)
      if (prevOgTitle != null) ogTitle.setAttribute('content', prevOgTitle)
      if (prevOgDesc != null) ogDesc.setAttribute('content', prevOgDesc)
    }
  }, [title, description])
}

function ensureMeta(name, property) {
  const selector = name
    ? `meta[name="${name}"]`
    : `meta[property="${property}"]`
  let tag = document.head.querySelector(selector)
  if (!tag) {
    tag = document.createElement('meta')
    if (name) tag.setAttribute('name', name)
    if (property) tag.setAttribute('property', property)
    document.head.appendChild(tag)
  }
  return tag
}
