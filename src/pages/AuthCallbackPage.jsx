import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout.jsx'
import { supabase } from '../lib/supabase.js'

export default function AuthCallbackPage() {
  const navigate = useNavigate()
  const [error, setError] = useState(null)

  useEffect(() => {
    let done = false
    const goHome = () => {
      if (done) return
      done = true
      navigate('/try', { replace: true })
    }

    supabase.auth.getSession().then(({ data, error: err }) => {
      if (err) setError(err.message)
      if (data?.session) goHome()
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) goHome()
    })

    const timer = setTimeout(() => {
      if (!done) setError('Не удалось подтвердить вход. Попробуйте ещё раз.')
    }, 8000)

    return () => {
      clearTimeout(timer)
      sub.subscription.unsubscribe()
    }
  }, [navigate])

  return (
    <Layout>
      <div className="flex min-h-[50vh] items-center justify-center px-4">
        {error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        ) : (
          <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
        )}
      </div>
    </Layout>
  )
}
