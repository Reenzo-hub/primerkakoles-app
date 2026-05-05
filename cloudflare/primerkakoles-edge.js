const PAGE_SIZE = 60

const PROFILE_SELECT =
  'id,email,phone,chat_id,first_name,username,generations_limit,generations_used'
const GENERATION_SELECT = 'id,car_url,wheel_url,result_url,source,created_at'

export default {
  async fetch(request, env, ctx) {
    try {
      if (request.method === 'OPTIONS') return corsResponse(null, 204)

      const url = new URL(request.url)
      if (url.pathname === '/api/profile') {
        return handleProfile(request, env)
      }
      if (url.pathname === '/api/gallery') {
        return handleGallery(env)
      }
      if (url.pathname === '/api/my-generations') {
        return handleMyGenerations(request, env)
      }
      if (url.pathname.startsWith('/media/')) {
        return handleMedia(request, env, ctx)
      }

      return jsonResponse({ error: 'Not found' }, 404)
    } catch (error) {
      return jsonResponse(
        { error: error.message || 'Edge error' },
        error.status || 500,
      )
    }
  },
}

async function handleProfile(request, env) {
  const user = await getUser(request, env)
  const url = new URL('/rest/v1/users', env.SUPABASE_URL)
  url.searchParams.set('select', PROFILE_SELECT)
  url.searchParams.set('auth_user_id', `eq.${user.id}`)
  url.searchParams.set('limit', '1')

  const data = await supabaseJson(url, env, request)
  return jsonResponse(data[0] || null)
}

async function handleGallery(env) {
  const url = new URL('/rest/v1/generations', env.SUPABASE_URL)
  url.searchParams.set('select', GENERATION_SELECT)
  url.searchParams.set('result_url', 'not.is.null')
  url.searchParams.set('order', 'created_at.desc')
  url.searchParams.set('limit', String(PAGE_SIZE))

  const data = await supabaseJson(url, env)
  return jsonResponse(data, 200, {
    'Cache-Control': 'public, max-age=30',
  })
}

async function handleMyGenerations(request, env) {
  const user = await getUser(request, env)
  const url = new URL('/rest/v1/generations', env.SUPABASE_URL)
  url.searchParams.set('select', GENERATION_SELECT)
  url.searchParams.set('auth_user_id', `eq.${user.id}`)
  url.searchParams.set('result_url', 'not.is.null')
  url.searchParams.set('order', 'created_at.desc')
  url.searchParams.set('limit', String(PAGE_SIZE))

  const data = await supabaseJson(url, env, request)
  return jsonResponse(data)
}

async function handleMedia(request, env, ctx) {
  const sourcePath = new URL(request.url).pathname.replace(/^\/media/, '')
  const sourceUrl = new URL(sourcePath, env.SUPABASE_URL)

  const cache = caches.default
  const cacheKey = new Request(request.url, request)
  const cached = await cache.match(cacheKey)
  if (cached) return withCors(cached)

  const response = await fetch(sourceUrl, {
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
    },
    cf: {
      cacheEverything: true,
      cacheTtl: 60 * 60 * 24,
    },
  })

  const headers = new Headers(response.headers)
  headers.set('Cache-Control', 'public, max-age=86400')
  const proxied = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })

  if (response.ok) ctx.waitUntil(cache.put(cacheKey, proxied.clone()))
  return withCors(proxied)
}

async function getUser(request, env) {
  const auth = request.headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) {
    throw new HttpError('Unauthorized', 401)
  }

  const response = await fetch(new URL('/auth/v1/user', env.SUPABASE_URL), {
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      Authorization: auth,
    },
  })

  if (!response.ok) throw new HttpError('Unauthorized', 401)
  return response.json()
}

async function supabaseJson(url, env, request) {
  const headers = {
    apikey: env.SUPABASE_ANON_KEY,
    Authorization:
      request?.headers.get('Authorization') || `Bearer ${env.SUPABASE_ANON_KEY}`,
  }

  const response = await fetch(url, { headers })
  const text = await response.text()
  if (!response.ok) {
    throw new HttpError(text || 'Supabase request failed', response.status)
  }
  return text ? JSON.parse(text) : null
}

function jsonResponse(data, status = 200, extraHeaders = {}) {
  return corsResponse(JSON.stringify(data), status, {
    'Content-Type': 'application/json; charset=utf-8',
    ...extraHeaders,
  })
}

function corsResponse(body, status = 200, headers = {}) {
  return new Response(body, {
    status,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      ...headers,
    },
  })
}

function withCors(response) {
  const headers = new Headers(response.headers)
  headers.set('Access-Control-Allow-Origin', '*')
  headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS')
  headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

class HttpError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}
