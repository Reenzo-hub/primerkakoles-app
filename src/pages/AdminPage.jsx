import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout.jsx'
import { sendAdminMaxMessage } from '../lib/adminMax.js'
import { sendAdminTelegramMessage } from '../lib/adminTelegram.js'
import { fetchEdgeJson, toMediaUrl } from '../lib/edgeApi.js'
import { useAuth } from '../lib/useAuth.js'
import { useSeo } from '../lib/useSeo.js'
import { supabase } from '../lib/supabase.js'

const ADMIN_EMAILS = ['naydikolesa@yandex.ru', 'renatio@mail.ru']

const PHOTO_LABELS = {
  result_url: 'Результат',
  car_url: 'Авто',
  wheel_url: 'Диск',
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
  const [meta, setMeta] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [query, setQuery] = useState('')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [previewUrl, setPreviewUrl] = useState(null)
  const [mobileDetailsOpen, setMobileDetailsOpen] = useState(false)
  const [limitDraft, setLimitDraft] = useState('')
  const [savingLimit, setSavingLimit] = useState(false)
  const [limitError, setLimitError] = useState(null)
  const [telegramMessage, setTelegramMessage] = useState('')
  const [sendingTelegram, setSendingTelegram] = useState(false)
  const [telegramNotice, setTelegramNotice] = useState(null)
  const [maxMessage, setMaxMessage] = useState('')
  const [sendingMax, setSendingMax] = useState(false)
  const [maxNotice, setMaxNotice] = useState(null)

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
        const data = await fetchAdminDashboard()
        if (cancelled) return
        setUsers(data.users || [])
        setGenerations(data.generations || [])
        setOrders(data.orders || [])
        setMeta(data.meta || {})
        setSelectedId(data.generations?.[0]?.id || null)
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Не удалось загрузить админку')
        }
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
      if (!order.user_id) return
      const stats =
        map.get(order.user_id) ||
        {
          orders: [],
          count: 0,
          lastOrder: null,
        }
      stats.orders.push(order)
      stats.count += 1
      if (
        !stats.lastOrder ||
        new Date(order.created_at || 0) > new Date(stats.lastOrder.created_at || 0)
      ) {
        stats.lastOrder = order
      }
      map.set(order.user_id, stats)
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
      const hasPlanPayment = String(profile?.plan || '').toLowerCase() === 'starter'
      const hasPayment = Boolean(stats?.count || hasPlanPayment)

      return {
        generation,
        profile,
        orders: stats?.orders || [],
        lastOrder: stats?.lastOrder || null,
        hasPayment,
        hasPlanPayment,
        left: Math.max(0, limit - used),
        displayName: getDisplayName(profile),
        searchText: [
          generation.id,
          generation.chat_id,
          profile?.id,
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
        if (paymentFilter === 'all') return true
        return paymentFilter === 'yes' ? row.hasPayment : !row.hasPayment
      })
      .sort(
        (a, b) =>
          new Date(b.generation.created_at || 0) -
          new Date(a.generation.created_at || 0),
      )
  }, [paymentFilter, query, rows, sourceFilter])

  const selectedRow =
    filteredRows.find((row) => row.generation.id === selectedId) ||
    rows.find((row) => row.generation.id === selectedId) ||
    filteredRows[0] ||
    null

  useEffect(() => {
    setLimitError(null)
    setTelegramMessage('')
    setTelegramNotice(null)
    setMaxMessage('')
    setMaxNotice(null)
    setLimitDraft(
      selectedRow?.profile?.generations_limit == null
        ? ''
        : String(selectedRow.profile.generations_limit),
    )
  }, [selectedRow?.generation.id, selectedRow?.profile?.generations_limit])

  const summary = useMemo(
    () => ({
      users: meta.user_count ?? users.length,
      generations: meta.generation_count ?? generations.length,
      orders: meta.order_count ?? orders.length,
    }),
    [generations.length, meta, orders.length, users.length],
  )

  const selectRow = (id) => {
    setSelectedId(id)
    setMobileDetailsOpen(true)
  }

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
      const updated = await callAdminRpc(
        'admin_update_user_generation_limit',
        {
          p_user_id: selectedRow.profile.id,
          p_generations_limit: nextLimit,
        },
      )

      const updatedProfile = Array.isArray(updated) ? updated[0] : updated
      if (!updatedProfile) throw new Error('Профиль не найден')

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

  const handleSendTelegram = async () => {
    if (!selectedRow?.profile?.id) return

    const text = telegramMessage.trim()
    if (!text) {
      setTelegramNotice({ type: 'error', text: 'Введите сообщение' })
      return
    }

    setSendingTelegram(true)
    setTelegramNotice(null)
    try {
      await sendAdminTelegramMessage({
        userId: selectedRow.profile.id,
        message: text,
      })
      setTelegramMessage('')
      setTelegramNotice({
        type: 'success',
        text: 'Сообщение отправлено в Telegram',
      })
    } catch (err) {
      const message =
        err?.message === 'Failed to fetch'
          ? 'Не удалось связаться с сервисом отправки'
          : err?.message || 'Не удалось отправить сообщение'
      setTelegramNotice({ type: 'error', text: message })
    } finally {
      setSendingTelegram(false)
    }
  }

  const handleSendMax = async () => {
    if (!selectedRow?.profile?.id) return

    const text = maxMessage.trim()
    if (!text) {
      setMaxNotice({ type: 'error', text: 'Введите сообщение' })
      return
    }

    setSendingMax(true)
    setMaxNotice(null)
    try {
      await sendAdminMaxMessage({
        userId: selectedRow.profile.id,
        message: text,
      })
      setMaxMessage('')
      setMaxNotice({
        type: 'success',
        text: 'Сообщение отправлено в MAX',
      })
    } catch (err) {
      const message =
        err?.message === 'Failed to fetch'
          ? 'Не удалось связаться с сервисом отправки'
          : err?.message || 'Не удалось отправить сообщение'
      setMaxNotice({ type: 'error', text: message })
    } finally {
      setSendingMax(false)
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
          <div className="grid grid-cols-3 gap-2">
            <Metric label="Пользователи" value={summary.users} />
            <Metric label="Примерки" value={summary.generations} />
            <Metric label="Оплаты" value={summary.orders} />
          </div>
        </div>

        {error && (
          <div className="mb-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="mb-5 grid gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur md:grid-cols-4">
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
          <Select label="Оплата" value={paymentFilter} onChange={setPaymentFilter}>
            <option value="all">Все</option>
            <option value="yes">Да</option>
            <option value="no">Нет</option>
          </Select>
        </div>

        {loading ? (
          <Loader />
        ) : (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_390px]">
            <section className="grid content-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredRows.map((row) => (
                <GenerationCard
                  key={row.generation.id}
                  row={row}
                  active={row.generation.id === selectedRow?.generation.id}
                  onClick={() => selectRow(row.generation.id)}
                />
              ))}
              {!filteredRows.length && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-sm text-neutral-400 sm:col-span-2 xl:col-span-3">
                  Ничего не найдено.
                </div>
              )}
            </section>

            <AdminDetails
              row={selectedRow}
              onPreview={setPreviewUrl}
              className="hidden lg:block lg:sticky lg:top-0 lg:min-h-screen"
              limitDraft={limitDraft}
              setLimitDraft={setLimitDraft}
              onSaveLimit={handleSaveLimit}
              savingLimit={savingLimit}
              limitError={limitError}
              telegramMessage={telegramMessage}
              setTelegramMessage={setTelegramMessage}
              setTelegramNotice={setTelegramNotice}
              onSendTelegram={handleSendTelegram}
              sendingTelegram={sendingTelegram}
              telegramNotice={telegramNotice}
              maxMessage={maxMessage}
              setMaxMessage={setMaxMessage}
              setMaxNotice={setMaxNotice}
              onSendMax={handleSendMax}
              sendingMax={sendingMax}
              maxNotice={maxNotice}
            />
          </div>
        )}
      </div>

      {mobileDetailsOpen && selectedRow && (
        <div className="fixed inset-0 z-40 bg-black/80 p-3 backdrop-blur-sm lg:hidden">
          <div className="mx-auto flex h-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/10 bg-neutral-950">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-white">
                  {selectedRow.displayName}
                </div>
                <div className="text-xs text-neutral-500">
                  {formatDateTime(selectedRow.generation.created_at)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileDetailsOpen(false)}
                className="ml-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-lg leading-none text-white"
                aria-label="Закрыть"
              >
                ×
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              <AdminDetails
                row={selectedRow}
                onPreview={setPreviewUrl}
                className="border-0 bg-transparent p-0"
                limitDraft={limitDraft}
                setLimitDraft={setLimitDraft}
                onSaveLimit={handleSaveLimit}
                savingLimit={savingLimit}
                limitError={limitError}
                telegramMessage={telegramMessage}
                setTelegramMessage={setTelegramMessage}
                setTelegramNotice={setTelegramNotice}
                onSendTelegram={handleSendTelegram}
                sendingTelegram={sendingTelegram}
                telegramNotice={telegramNotice}
                maxMessage={maxMessage}
                setMaxMessage={setMaxMessage}
                setMaxNotice={setMaxNotice}
                onSendMax={handleSendMax}
                sendingMax={sendingMax}
                maxNotice={maxNotice}
              />
            </div>
          </div>
        </div>
      )}

      {previewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setPreviewUrl(null)}
        >
          <img
            src={previewUrl}
            alt=""
            className="max-h-[90vh] max-w-full rounded-xl"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </Layout>
  )
}

async function fetchAdminDashboard() {
  const data = await callAdminRpc('admin_get_dashboard')
  return data || { users: [], generations: [], orders: [], meta: {} }
}

async function callAdminRpc(name, params = {}) {
  try {
    return await fetchEdgeJson(`/rest/rpc/${name}`, {
      auth: true,
      method: 'POST',
      body: params,
    })
  } catch {
    const { data, error } = await supabase.rpc(name, params)
    if (error) throw error
    return data
  }
}

function GenerationCard({ row, active, onClick }) {
  const { generation, profile } = row
  return (
    <button
      type="button"
      onClick={onClick}
      className={`overflow-hidden rounded-2xl border text-left transition ${
        active
          ? 'border-orange-400/70 bg-orange-500/10'
          : 'border-white/10 bg-white/[0.03] hover:border-white/25'
      }`}
    >
      <div className="grid grid-cols-3 gap-px bg-white/10">
        {['result_url', 'car_url', 'wheel_url'].map((key) => (
          <PhotoTile key={key} url={generation[key]} label={PHOTO_LABELS[key]} />
        ))}
      </div>
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-white">
              {row.displayName}
            </div>
            <div className="mt-1 text-xs text-neutral-400">
              {formatDateTime(generation.created_at)}
            </div>
          </div>
          <Badge>{generation.source || 'unknown'}</Badge>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-neutral-500">
              Лимит
            </div>
            <div className="mt-1 font-semibold text-white">
              {profile?.generations_used ?? 0}/{profile?.generations_limit ?? 0}
            </div>
          </div>
          {row.hasPayment && (
            <span
              className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-sm font-bold text-white"
              title={row.hasPlanPayment ? 'Оплата: plan starter' : 'Оплата есть'}
              aria-label="Оплата есть"
            >
              ✓
            </span>
          )}
        </div>

        <div className="truncate text-xs text-neutral-500">
          {profile?.email || profile?.phone || profile?.id || generation.id}
        </div>
      </div>
    </button>
  )
}

function AdminDetails({
  row,
  onPreview,
  className = '',
  limitDraft,
  setLimitDraft,
  onSaveLimit,
  savingLimit,
  limitError,
  telegramMessage,
  setTelegramMessage,
  setTelegramNotice,
  onSendTelegram,
  sendingTelegram,
  telegramNotice,
  maxMessage,
  setMaxMessage,
  setMaxNotice,
  onSendMax,
  sendingMax,
  maxNotice,
}) {
  if (!row) {
    return (
      <aside
        className={`rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-neutral-400 ${className}`}
      >
        Выберите примерку.
      </aside>
    )
  }

  const { generation, profile, orders } = row

  return (
    <aside
      className={`rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur ${className}`}
    >
      <div className="grid grid-cols-3 gap-2">
        {['result_url', 'car_url', 'wheel_url'].map((key) => (
          <button
            key={key}
            type="button"
            disabled={!generation[key]}
            onClick={() => onPreview(toMediaUrl(generation[key]))}
            className="overflow-hidden rounded-xl border border-white/10 bg-neutral-950 disabled:cursor-not-allowed"
          >
            <PhotoTile url={generation[key]} label={PHOTO_LABELS[key]} />
          </button>
        ))}
      </div>

      <DetailBlock title="Примерка">
        <Detail label="generation id" value={generation.id} mono />
        <Detail label="created" value={formatDateTime(generation.created_at)} />
        <Detail label="source" value={generation.source || 'unknown'} />
        <Detail label="chat_id" value={generation.chat_id || '—'} mono />
      </DetailBlock>

      <DetailBlock title="Пользователь">
        <Detail label="name" value={getDisplayName(profile)} />
        <Detail label="user id" value={profile?.id || '—'} mono />
        <Detail label="email" value={profile?.email || '—'} />
        <Detail label="phone" value={profile?.phone || '—'} />
        <UsernameDetail
          username={profile?.username}
          linkToTelegram={!isMaxGeneration(generation)}
        />
        <Detail label="plan" value={profile?.plan || '—'} />
        <Detail label="updated" value={formatDateTime(profile?.updated_at)} />
      </DetailBlock>

      {isTelegramGeneration(generation) && (
        <AdminMessageComposer
          title="Сообщение в Telegram"
          channel="Telegram"
          hasRecipient={Boolean(profile?.chat_id)}
          message={telegramMessage}
          setMessage={setTelegramMessage}
          setNotice={setTelegramNotice}
          onSend={onSendTelegram}
          sending={sendingTelegram}
          notice={telegramNotice}
          maxLength={4096}
          buttonClassName="bg-sky-500 hover:bg-sky-400"
        />
      )}

      {isMaxGeneration(generation) && (
        <AdminMessageComposer
          title="Сообщение в MAX"
          channel="MAX"
          hasRecipient={Boolean(profile?.chat_id)}
          message={maxMessage}
          setMessage={setMaxMessage}
          setNotice={setMaxNotice}
          onSend={onSendMax}
          sending={sendingMax}
          notice={maxNotice}
          maxLength={4000}
          buttonClassName="bg-violet-500 hover:bg-violet-400"
        />
      )}

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
        {row.hasPlanPayment && (
          <div className="mb-2 rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-100">
            Покупка отмечена в профиле: plan = starter
          </div>
        )}
        {orders.length ? (
          <div className="space-y-2">
            {orders.map((order) => (
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

function AdminMessageComposer({
  title,
  channel,
  hasRecipient,
  message,
  setMessage,
  setNotice,
  onSend,
  sending,
  notice,
  maxLength,
  buttonClassName,
}) {
  return (
    <DetailBlock title={title}>
      {hasRecipient ? (
        <div>
          <textarea
            value={message}
            onChange={(event) => {
              setMessage(event.target.value)
              setNotice(null)
            }}
            maxLength={maxLength}
            rows={5}
            placeholder="Введите персональное сообщение"
            aria-label={`Сообщение в ${channel}`}
            className="w-full resize-y rounded-xl border border-white/10 bg-neutral-950/70 px-3 py-2 text-sm text-white outline-none transition placeholder:text-neutral-600 focus:border-sky-400/60"
          />
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="text-xs text-neutral-500">
              {message.length}/{maxLength}
            </span>
            <button
              type="button"
              onClick={onSend}
              disabled={sending || !message.trim()}
              className={`rounded-xl px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:text-neutral-400 ${buttonClassName}`}
            >
              {sending ? 'Отправляем...' : 'Отправить'}
            </button>
          </div>
          {notice && (
            <p
              className={`mt-3 rounded-xl border p-3 text-xs ${
                notice.type === 'success'
                  ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100'
                  : 'border-red-400/20 bg-red-500/10 text-red-200'
              }`}
            >
              {notice.text}
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-neutral-500">
          У пользователя нет идентификатора {channel}.
        </p>
      )}
    </DetailBlock>
  )
}

function UsernameDetail({ username, linkToTelegram = true }) {
  const clean = username ? String(username).replace(/^@/, '') : ''
  if (!clean) return <Detail label="username" value="—" />
  if (!linkToTelegram) return <Detail label="username" value={`@${clean}`} />
  return (
    <div className="min-w-0 text-xs">
      <div className="text-neutral-500">username</div>
      <a
        href={`https://t.me/${clean}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-0.5 inline-block break-all text-sky-300 transition hover:text-sky-200 hover:underline"
      >
        @{clean}
      </a>
    </div>
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

function PhotoTile({ url, label }) {
  const mediaUrl = toMediaUrl(url)
  return (
    <div className="relative aspect-square bg-neutral-900">
      {mediaUrl ? (
        <img
          src={mediaUrl}
          alt={label}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="flex h-full items-center justify-center text-[11px] text-neutral-600">
          Нет фото
        </div>
      )}
      <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white">
        {label}
      </span>
    </div>
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

function isTelegramGeneration(generation) {
  const source = normalizeSource(generation?.source)
  if (isMaxSource(source)) return false
  return source === 'tg' || source.startsWith('telegram') || (!source && generation?.chat_id != null)
}

function isMaxGeneration(generation) {
  return isMaxSource(normalizeSource(generation?.source))
}

function isMaxSource(source) {
  return source.startsWith('max') || source === 'макс'
}

function normalizeSource(source) {
  return String(source || '').trim().toLowerCase()
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
