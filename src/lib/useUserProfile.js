import { useEffect, useState } from 'react'
import { supabase } from './supabase.js'

export function useUserProfile(user) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user) {
      setProfile(null)
      return
    }
    let cancelled = false
    setLoading(true)
    supabase
      .from('users')
      .select('id, email, chat_id, generations_limit, generations_used')
      .eq('auth_user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return
        setProfile(data)
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [user?.id])

  return { profile, loading }
}
