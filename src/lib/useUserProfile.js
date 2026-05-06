import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase.js'
import { fetchEdgeJson } from './edgeApi.js'

const SELECT =
  'id, email, phone, chat_id, first_name, username, generations_limit, generations_used'

export function useUserProfile(user) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(false)

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setProfile(null)
      return
    }
    setLoading(true)
    const data = await fetchProfileData(user.id)
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
      const data = await fetchProfileData(user.id)
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

async function fetchProfileData(userId) {
  try {
    const query = new URLSearchParams({
      select: SELECT,
      auth_user_id: `eq.${userId}`,
      limit: '1',
    })
    const data = await fetchEdgeJson(`/rest/users?${query.toString()}`, {
      auth: true,
    })
    return data?.[0] || null
  } catch {
    const { data } = await supabase
      .from('users')
      .select(SELECT)
      .eq('auth_user_id', userId)
      .maybeSingle()
    return data
  }
}
