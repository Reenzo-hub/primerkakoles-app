import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout.jsx'
import { toMediaUrl } from '../lib/edgeApi.js'
import { useAuth } from '../lib/useAuth.js'
import { useSeo } from '../lib/useSeo.js'
import { supabase } from '../lib/supabase.js'

const ADMIN_EMAILS = ['naydikolesa@yandex.ru', 'renatio@mail.ru']

const VIEW_LABELS = {
  result: 'Результат',
  car: 'Авто',
  wheel: 'Диск',
}

export default function AdminPage() {
  useSeo({
    title: 'Админка · Примерка Колёс',
    description: 'Скрытая панель администратора.',
  })

  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [users, setUsers] = useState([])
  const [generations, setGenerations] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [previewView, setPreviewView] = useState('result')
  const [query, setQuery] = useState('')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [resultFilter, setResultFilter] = useState('all')
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [sortBy, setSortBy] = useState('created_desc')
  const [limitDraft, setLimitDraft] = useState('')
  const [savingLimit, setSavingLimit] = useState(false)
  const [limitError, setLimitError] = useState(null)

  const isAdmin = ADMIN_EMAILS.includes((user?.email || '').toLowerCase())

  useEffect(() => {
    if (!authLoading && !user) navigate('/login', { replace: true })
  }, [authLoading, user, navigate])

  useEffect(() => {
    if (!user || !isAdmin) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchAdminOverview()
        if (cancelled) return
        setUsers(data.users || [])
        setGenerations(data.generations || [])
        setOrders(data.orders || [])
        setSelectedId(data.generations?.[0]?.id || null)
      } catch (err) {
        if (!cancelled) setError(err.message || 'Не удалось загрузить админку')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user?.id, isAdmin])

  const userByKey = useMemo(() => {
    const map = new Map()
    users.forEach((item) => {
      if (item.id) map.set(`id:${item.id}`, item)
      if (item.auth_user_id) map.set(`auth:${item.auth_user_id}`, item)
      if (item.chat_id != null) map.set(`chat:${item.chat_id}`, item)
    })
    return map
  }, [users])

  const orderStatsByUserId = useMemo(() => {
    const map = new Map()
    orders.forEach((order) => {
      const key = order.user_id
      if (!key) return
      const stats =
        map.get(key) ||
        {
          orders: [],
          succeededCount: 0,
          succeededAmount: 0,
          lastStatus: null,
        }
      stats.orders.push(order)
      if (order.status === 'succeeded') {
        stats.succeededCount += 1
        stats.succeededAmount += Number(order.amount_rub || 0)
      }
      if (
        !stats.lastStatus ||
        new Date(order.created_at || 0) > new Date(stats.lastStatus.created_at || 0)
      ) {
        stats.lastStatus = order
      }
      map.set(key, stats)
    })
    return map
  }, [orders])

  const rows = useMemo(() => {
    return generations.map((generation) => {
      const profile =
        userByKey.get(`auth:${generation.auth_user_id}`) ||
        userByKey.get(`chat:${generation.chat_id}`) ||
        null
      const stats = profile ? orderStatsByUserId.get(profile.id) : null
      const limit = Number(profile?.generations_limit || 0)
      const used = Number(profile?.generations_used || 0)
      return {
        generation,
        profile,
        orders: stats?.orders || [],
        succeededCount: stats?.succeededCount || 0,
        succeededAmount: stats?.succeededAmount || 0,
        lastOrder: stats?.lastStatus || null,
        left: Math.max(0, limit - used),
        displayName: getDisplayName(profile),
        searchText: [
          generation.id,
          generation.auth_user_id,
          generation.chat_id,
          profile?.id,
          profile?.auth_user_id,
          profile?.email,
          profile?.phone,
          profile?.username,
          profile?.first_name,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase(),
      }
    })
  }, [generations, orderStatsByUserId, userByKey])

  const filteredRows = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return rows
      .filter((row) => !needle || row.searchText.includes(needle))
      .filter((row) => sourceFilter === 'all' || row.generation.source === sourceFilter)
      .filter((row) => {
        if (resultFilter === 'all') return true
        return resultFilter === 'with'
          ? Boolean(row.generation.result_url)
          : !row.generation.result_url
      })
      .filter((row) => {
        if (paymentFilter === 'all') return true
        if (paymentFilter === 'failed') {
          return ['failed', 'canceled'].includes(row.lastOrder?.status)
        }
        return row.lastOrder?.status === paymentFilter
      })
      .sort((a, b) => sortRows(a, b, sortBy))
  }, [paymentFilter, query, resultFilter, rows, sortBy, sourceFilter])

  const selectedRow =
    filteredRows.find((row) => row.generation.id === selectedId) ||
    rows.find((row) => row.generation.id === selectedId) ||
    filteredRows[0] ||
    null

  useEffect(() => {
    setPreviewView('result')
    setLimitError(null)
    setLimitDraft(
      selectedRow?.profile?.generations_limit == null
        ? ''
        : String(selectedRow.profile.generations_limit),
    )
  }, [selectedRow?.generation.id, selectedRow?.profile?.generations_limit])

  const summary = useMemo(() => {
    const paid = orders.filter((item) => item.status === 'succeeded')
    return {
      users: users.length,
      generations: generations.length,
      paidAmount: paid.reduce((sum, item) => sum + Number(item.amount_rub || 0), 0),
      pending: orders.filter((item) => item.status === 'pending').length,
    }
  }, [generations.length, orders, users.length])

  const handleSaveLimit = async () => {
    if (!selectedRow?.profile) return
    const nextLimit = Number(limitDraft)
    const used = Number(selectedRow.profile.generations_used || 0)
    if (!Number.isInteger(nextLimit) || nextLimit < used) {
      setLimitError(`Лимит должен быть целым числом не меньше ${used}`)
      return
    }

    setSavingLimit(true)
    setLimitError(null)
    try {
      const { data: updated, error: updateError } = await supabase.rpc(
        'admin_update_user_generation_limit',
        {
          p_user_id: selectedRow.profile.id,
          p_generations_limit: nextLimit,
        },
      )

      if (updateError) {
        throw updateError
      }

      const updatedProfile = Array.isArray(updated) ? updated[0] : updated
      if (!updatedProfile) {
        throw new Error('Профиль не найден')
      }

      setUsers((current) =>
        current.map((item) =>
          item.id === updatedProfile.id ? { ...item, ...updatedProfile } : item,
        ),
      )
    } catch (err) {
      setLimitError(err.message || 'Не удалось сохранить лимит')
    } finally {
      setSavingLimit(false)
    }
  }

  if (authLoading || !user) {
    return (
      <Layout>
        <Loader />
      </Layout>
    )
  }

  if (user && !isAdmin) {
    return (
      <Layout>
        <div className="mx-auto max-w-xl px-4 py-20 text-center sm:px-6">
          <h1 className="text-3xl font-black text-white">Нет доступа</h1>
          <p className="mt-3 text-sm text-neutral-400">
            Эта страница доступна только администратору.
          </p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="bg-gradient-to-b from-white to-neutral-400 bg-clip-text text-3xl font-black tracking-tight text-transparent sm:text-5xl">
              Админка
            </h1>
            <p className="mt-2 text-sm text-neutral-400">
              Примерки, пользователи, лимиты и оплаты
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Metric label="Пользователи" value={summary.users} />
            <Metric label="Примерки" value={summary.generations} />
            <Metric label="Оплачено" value={`${summary.paidAmount} ₽`} />
            <Metric label="Pending" value={summary.pending} />
          </div>
        </div>

        {error && (
          <div className="mb-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="mb-5 grid gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur md:grid-cols-5">
          <label className="md:col-span-2">
            <span className="text-xs uppercase tracking-wider text-neutral-500">
              Поиск
            </span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="email, phone, username, id"
              className="mt-2 w-full rounded-xl border border-white/10 bg-neutral-950/70 px-3 py-2 text-sm text-white outline-none transition placeholder:text-neutral-600 focus:border-orange-400/60"
            />
          </label>
          <Select label="Источник" value={sourceFilter} onChange={setSourceFilter}>
            <option value="all">Все</option>
            <option value="web">web</option>
            <option value="telegram">telegram</option>
          </Select>
          <Select label="Результат" value={resultFilter} onChange={setResultFilter}>
            <option value="all">Все</option>
            <option value="with">Есть фото</option>
            <option value="without">Без фото</option>
          </Select>
          <Select label="Оплата" value={paymentFilter} onChange={setPaymentFilter}>
            <option value="all">Все</option>
            <option value="succeeded">succeeded</option>
            <option value="pending">pending</option>
            <option value="failed">failed/canceled</option>
          </Select>
          <Select label="Сортировка" value={sortBy} onChange={setSortBy}>
            <option value="created_desc">Новые примерки</option>
            <option value="created_asc">Старые примерки</option>
            <option value="user_asc">Пользователь A-Z</option>
            <option value="left_asc">Остаток меньше</option>
            <option value="left_desc">Остаток больше</option>
          </Select>
        </div>

        {loading ? (
          <Loader />
        ) : (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
            <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur">
              <div className="hidden max-h-[72vh] overflow-auto lg:block">
                <table className="w-full min-w-[980px] border-collapse text-left text-sm">
                  <thead className="sticky top-0 z-10 bg-neutral-950/95 text-xs uppercase tracking-wider text-neutral-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Фото</th>
                      <th className="px-4 py-3 font-semibold">Время</th>
                      <th className="px-4 py-3 font-semibold">Source</th>
                      <th className="px-4 py-3 font-semibold">User id</th>
                      <th className="px-4 py-3 font-semibold">Пользователь</th>
                      <th className="px-4 py-3 font-semibold">Контакт</th>
                      <th className="px-4 py-3 font-semibold">Баланс</th>
                      <th className="px-4 py-3 font-semibold">Оплаты</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredRows.map((row) => (
                      <AdminTableRow
                        key={row.generation.id}
                        row={row}
                        active={row.generation.id === selectedRow?.generation.id}
                        onClick={() => setSelectedId(row.generation.id)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-3 p-3 lg:hidden">
                {filteredRows.map((row) => (
                  <button
                    key={row.generation.id}
                    type="button"
                    onClick={() => setSelectedId(row.generation.id)}
                    className={`rounded-xl border p-3 text-left transition ${
                      row.generation.id === selectedRow?.generation.id
                        ? 'border-orange-400/60 bg-orange-500/10'
                        : 'border-white/10 bg-white/[0.03] hover:border-white/25'
                    }`}
                  >
                    <div className="flex gap-3">
                      <Thumb generation={row.generation} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium text-white">
                          {row.displayName}
                        </div>
                        <div className="mt-1 text-xs text-neutral-400">
                          {formatDateTime(row.generation.created_at)}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                          <Badge>{row.generation.source || 'unknown'}</Badge>
                          <Badge>
                            {row.left} / {row.profile?.generations_limit ?? 0}
                          </Badge>
                          <Badge>{row.lastOrder?.status || 'без оплат'}</Badge>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {!filteredRows.length && (
                <div className="p-8 text-center text-sm text-neutral-400">
                  Ничего не найдено.
                </div>
              )}
            </section>

            <AdminDetails
              row={selectedRow}
              previewView={previewView}
              setPreviewView={setPreviewView}
              limitDraft={limitDraft}
              setLimitDraft={setLimitDraft}
              onSaveLimit={handleSaveLimit}
              savingLimit={savingLimit}
              limitError={limitError}
            />
          </div>
        )}
      </div>
    </Layout>
  )
}

async function fetchAdminOverview() {
  const [usersResult, generationsResult, ordersResult] = await Promise.all([
    supabase
      .from('users')
      .select(
        'id, auth_user_id, email, phone, chat_id, first_name, username, generations_limit, generations_used, updated_at',
      )
      .order('updated_at', { ascending: false })
      .limit(1000),
    supabase
      .from('generations')
      .select('id, auth_user_id, chat_id, car_url, wheel_url, result_url, source, created_at')
      .order('created_at', { ascending: false })
      .limit(1000),
    supabase
      .from('generation_orders')
      .select(
        'id, auth_user_id, user_id, package_code, generations_count, amount_rub, currency, status, yookassa_payment_id, credited_at, created_at, updated_at',
      )
      .order('created_at', { ascending: false })
      .limit(1000),
  ])

  const error = usersResult.error || generationsResult.error || ordersResult.error
  if (error) throw error

  return {
    users: usersResult.data || [],
    generations: generationsResult.data || [],
    orders: ordersResult.data || [],
  }
}

function AdminTableRow({ row, active, onClick }) {
  const { generation, profile } = row
  return (
    <tr
      onClick={onClick}
      className={`cursor-pointer transition ${
        active ? 'bg-orange-500/10' : 'hover:bg-white/[0.04]'
      }`}
    >
      <td className="px-4 py-3">
        <Thumb generation={generation} />
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-neutral-300">
        {formatDateTime(generation.created_at)}
      </td>
      <td className="px-4 py-3">
        <Badge>{generation.source || 'unknown'}</Badge>
      </td>
      <td className="max-w-[150px] truncate px-4 py-3 font-mono text-xs text-neutral-400">
        {profile?.id || generation.auth_user_id || generation.chat_id || '—'}
      </td>
      <td className="max-w-[180px] truncate px-4 py-3 text-white">
        {row.displayName}
      </td>
      <td className="max-w-[180px] truncate px-4 py-3 text-neutral-400">
        {profile?.email || profile?.phone || '—'}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-neutral-300">
        {row.left} доступно · {profile?.generations_used ?? 0} /{' '}
        {profile?.generations_limit ?? 0}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-neutral-300">
        {row.succeededAmount} ₽ · {row.succeededCount} ·{' '}
        {row.lastOrder?.status || '—'}
      </td>
    </tr>
  )
}

function AdminDetails({
  row,
  previewView,
  setPreviewView,
  limitDraft,
  setLimitDraft,
  onSaveLimit,
  savingLimit,
  limitError,
}) {
  if (!row) {
    return (
      <aside className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-neutral-400">
        Выберите примерку.
      </aside>
    )
  }

  const { generation, profile, orders } = row
  const activeUrl = toMediaUrl(generation[`${previewView}_url`])

  return (
    <aside className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur lg:sticky lg:top-4 lg:max-h-[72vh] lg:overflow-auto">
      <div className="overflow-hidden rounded-xl border border-white/10 bg-neutral-950">
        {activeUrl ? (
          <img
            src={activeUrl}
            alt={VIEW_LABELS[previewView]}
            className="aspect-square w-full object-cover"
          />
        ) : (
          <div className="flex aspect-square items-center justify-center text-sm text-neutral-500">
            Нет изображения
          </div>
        )}
      </div>

      <div className="mt-3 flex gap-2 rounded-full border border-white/10 bg-white/5 p-1">
        {['result', 'car', 'wheel'].map((key) => (
          <button
            key={key}
            type="button"
            disabled={!generation[`${key}_url`]}
            onClick={() => setPreviewView(key)}
            className={`flex-1 rounded-full px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:text-neutral-600 ${
              previewView === key
                ? 'bg-white text-neutral-950'
                : 'text-neutral-300 hover:bg-white/10'
            }`}
          >
            {VIEW_LABELS[key]}
          </button>
        ))}
      </div>

      <DetailBlock title="Примерка">
        <Detail label="generation id" value={generation.id} mono />
        <Detail label="created" value={formatDateTime(generation.created_at)} />
        <Detail label="source" value={generation.source || 'unknown'} />
        <Detail label="auth_user_id" value={generation.auth_user_id || '—'} mono />
        <Detail label="chat_id" value={generation.chat_id || '—'} mono />
      </DetailBlock>

      <DetailBlock title="Пользователь">
        <Detail label="name" value={getDisplayName(profile)} />
        <Detail label="user id" value={profile?.id || '—'} mono />
        <Detail label="email" value={profile?.email || '—'} />
        <Detail label="phone" value={profile?.phone || '—'} />
        <Detail label="username" value={profile?.username ? `@${profile.username}` : '—'} />
        <Detail label="updated" value={formatDateTime(profile?.updated_at)} />
      </DetailBlock>

      <DetailBlock title="Лимиты">
        <div className="grid grid-cols-3 gap-2 text-center">
          <Metric label="Осталось" value={row.left} />
          <Metric label="Использовано" value={profile?.generations_used ?? 0} />
          <Metric label="Лимит" value={profile?.generations_limit ?? 0} />
        </div>
        {profile ? (
          <div className="mt-3 flex gap-2">
            <input
              type="number"
              min={profile.generations_used || 0}
              value={limitDraft}
              onChange={(event) => setLimitDraft(event.target.value)}
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-neutral-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-orange-400/60"
            />
            <button
              type="button"
              onClick={onSaveLimit}
              disabled={savingLimit}
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-neutral-950 transition hover:bg-orange-500 hover:text-white disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:text-neutral-400"
            >
              {savingLimit ? 'Сохр...' : 'Сохранить'}
            </button>
          </div>
        ) : (
          <p className="mt-3 text-sm text-neutral-500">
            Профиль не найден, лимит изменить нельзя.
          </p>
        )}
        {limitError && <p className="mt-2 text-xs text-red-300">{limitError}</p>}
      </DetailBlock>

      <DetailBlock title="Оплаты">
        {orders.length ? (
          <div className="space-y-2">
            {orders.slice(0, 10).map((order) => (
              <div
                key={order.id}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-white">
                    {order.amount_rub} {order.currency}
                  </span>
                  <Badge>{order.status}</Badge>
                </div>
                <div className="mt-2 text-xs text-neutral-400">
                  {order.package_code} · {order.generations_count} генераций
                </div>
                <Detail label="created" value={formatDateTime(order.created_at)} />
                <Detail label="credited" value={formatDateTime(order.credited_at)} />
                <Detail label="yookassa" value={order.yookassa_payment_id || '—'} mono />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-neutral-500">Оплат пока нет.</p>
        )}
      </DetailBlock>
    </aside>
  )
}

function Select({ label, value, onChange, children }) {
  return (
    <label>
      <span className="text-xs uppercase tracking-wider text-neutral-500">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-xl border border-white/10 bg-neutral-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-orange-400/60"
      >
        {children}
      </select>
    </label>
  )
}

function DetailBlock({ title, children }) {
  return (
    <section className="mt-5 border-t border-white/10 pt-4">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
        {title}
      </h2>
      <div className="space-y-2">{children}</div>
    </section>
  )
}

function Detail({ label, value, mono = false }) {
  return (
    <div className="min-w-0 text-xs">
      <div className="text-neutral-500">{label}</div>
      <div
        className={`mt-0.5 break-all text-neutral-200 ${
          mono ? 'font-mono' : ''
        }`}
      >
        {value || '—'}
      </div>
    </div>
  )
}

function Metric({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-neutral-500">
        {label}
      </div>
      <div className="mt-1 text-base font-semibold text-white">{value}</div>
    </div>
  )
}

function Thumb({ generation }) {
  const url = toMediaUrl(generation.result_url || generation.car_url || generation.wheel_url)
  if (!url) {
    return (
      <div className="h-14 w-14 rounded-xl border border-white/10 bg-white/5" />
    )
  }
  return (
    <img
      src={url}
      alt=""
      className="h-14 w-14 rounded-xl object-cover"
      loading="lazy"
    />
  )
}

function Badge({ children }) {
  return (
    <span className="inline-flex rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-medium text-neutral-300">
      {children}
    </span>
  )
}

function Loader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
    </div>
  )
}

function getDisplayName(profile) {
  if (!profile) return 'Без профиля'
  return (
    profile.first_name ||
    (profile.username ? `@${profile.username}` : null) ||
    profile.email ||
    profile.phone ||
    profile.chat_id ||
    profile.id ||
    'Без имени'
  )
}

function sortRows(a, b, sortBy) {
  if (sortBy === 'created_asc') {
    return new Date(a.generation.created_at || 0) - new Date(b.generation.created_at || 0)
  }
  if (sortBy === 'user_asc') {
    return a.displayName.localeCompare(b.displayName, 'ru')
  }
  if (sortBy === 'left_asc') return a.left - b.left
  if (sortBy === 'left_desc') return b.left - a.left
  return new Date(b.generation.created_at || 0) - new Date(a.generation.created_at || 0)
}

function formatDateTime(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('ru-RU', {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}
