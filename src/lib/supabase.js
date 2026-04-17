import { createClient } from '@supabase/supabase-js'

const FALLBACK_URL = 'https://tzkvbtozhsrlmcpbrstp.supabase.co'
const FALLBACK_ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6a3ZidG96aHNybG1jcGJyc3RwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MjU3MjAsImV4cCI6MjA4NDUwMTcyMH0.LYF0MkDFEme0m4fO1BFyGEjXBIhIigMsWJxJmLdx0Ew'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || FALLBACK_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || FALLBACK_ANON

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})
