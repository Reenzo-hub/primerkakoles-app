import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'

const STORAGE_KEY = 'primerkakoles.user'
const AUTH_WEBHOOK_URL = import.meta.env.VITE_AUTH_WEBHOOK_URL

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
    else localStorage.removeItem(STORAGE_KEY)
  }, [user])

  const loginWithTelegram = useCallback(async (telegramUser) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(AUTH_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(telegramUser),
      })
      if (!res.ok) throw new Error(`Auth failed: ${res.status}`)
      const data = await res.json().catch(() => null)

      const normalized = normalizeUser(data, telegramUser)
      if (!normalized?.chat_id) throw new Error('Некорректный ответ авторизации')
      setUser(normalized)
      return normalized
    } catch (e) {
      setError(e.message || 'Ошибка авторизации')
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const loginAsDev = useCallback((userData) => {
    setUser(userData)
    return userData
  }, [])

  const logout = useCallback(() => {
    setUser(null)
  }, [])

  const refreshBalance = useCallback(async () => {
    if (!user?.chat_id) return
    const { data, error: err } = await supabase
      .from('users')
      .select('generations_left')
      .eq('chat_id', user.chat_id)
      .maybeSingle()
    if (err) return
    if (data && typeof data.generations_left === 'number') {
      setUser((prev) => (prev ? { ...prev, generations_left: data.generations_left } : prev))
    }
  }, [user?.chat_id])

  const decrementBalance = useCallback(() => {
    setUser((prev) =>
      prev ? { ...prev, generations_left: Math.max(0, (prev.generations_left ?? 0) - 1) } : prev,
    )
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      error,
      loginWithTelegram,
      loginAsDev,
      logout,
      refreshBalance,
      decrementBalance,
    }),
    [
      user,
      loading,
      error,
      loginWithTelegram,
      loginAsDev,
      logout,
      refreshBalance,
      decrementBalance,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

function normalizeUser(payload, telegramUser) {
  const source = (payload && (payload.user || payload.data || payload)) || {}
  const chat_id = source.chat_id ?? source.chatId ?? telegramUser?.id
  return {
    id: source.id ?? null,
    chat_id: chat_id ? Number(chat_id) : null,
    username: source.username ?? telegramUser?.username ?? null,
    first_name: source.first_name ?? telegramUser?.first_name ?? null,
    generations_left: source.generations_left ?? source.generationsLeft ?? 0,
    email: source.email ?? null,
  }
}
