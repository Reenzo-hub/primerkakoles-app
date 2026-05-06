import { supabase } from './supabase.js'

const configuredEdgeUrl = (import.meta.env.VITE_EDGE_URL || '').replace(/\/$/, '')
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '')
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export async function fetchEdgeJson(path, { auth = false } = {}) {
  const edgeUrl = getEdgeUrl()
  if (edgeUrl == null) {
    throw new Error('Edge API is not configured')
  }

  const token = auth ? await getAccessToken() : null
  const headers = {
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${token || supabaseAnonKey}`,
  }

  const response = await fetch(`${edgeUrl}${path}`, { headers })
  if (!response.ok) {
    throw new Error(`Edge request failed: ${response.status}`)
  }
  return response.json()
}

export function toMediaUrl(url) {
  const edgeUrl = getEdgeUrl()
  if (!url || !supabaseUrl || edgeUrl == null) return url

  const storagePrefix = `${supabaseUrl}/storage/v1/`
  if (!url.startsWith(storagePrefix)) return url

  return `${edgeUrl}/storage/${url.slice(storagePrefix.length)}`
}

function getEdgeUrl() {
  if (configuredEdgeUrl) return configuredEdgeUrl
  if (typeof window !== 'undefined' && window.location.hostname === 'app.primerkakoles.ru') {
    return 'https://api.primerkakoles.ru'
  }
  return null
}

async function getAccessToken() {
  const { data } = await supabase.auth.getSession()
  const token = data?.session?.access_token
  if (!token) throw new Error('Нет активной сессии')
  return token
}
