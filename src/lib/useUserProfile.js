import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase.js'

const SELECT =
  'id, email, chat_id, first_name, username, generations_limit, generations_used'

export function useUserProfile(user) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(false)

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setProfile(null)
      return
    }
    setLoading(true)
    const { data } = await supabase
      .from('users')
      .select(SELECT)
      .eq('auth_user_id', user.id)
      .maybeSingle()
    setProfile(data)
    setLoading(false)
  }, [user?.id])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!user) {
        setProfile(null)
        return
      }
      setLoading(true)
      const { data } = await supabase
        .from('users')
        .select(SELECT)
        .eq('auth_user_id', user.id)
        .maybeSingle()
      if (cancelled) return
      setProfile(data)
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [user?.id])

  return { profile, loading, refetch: fetchProfile }
}
