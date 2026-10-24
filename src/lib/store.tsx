import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { Entity, Kind, KindMap, Member, TripSettings, TripState } from '../../shared/types.ts'
import { api, ApiError } from './api.ts'
import { local, sessions, setLocal } from './session.ts'

interface Ctx {
  state: TripState
  token: string
  me: Member
  online: boolean
  readOnly: boolean
  member: (id: string) => Member | undefined
  list: <K extends Kind>(kind: K) => Entity<K>[]
  refresh: () => Promise<void>
  save: <K extends Kind>(kind: K, data: KindMap[K], opts?: { id?: string; activity?: string }) => Promise<string | undefined>
  remove: (id: string, activity?: string) => Promise<void>
  restore: (id: string) => Promise<void>
  patchTrip: (body: { name?: string; destination?: string; theme?: string; startDate?: string; endDate?: string; settings?: TripSettings; activity?: string }) => Promise<boolean>
  call: (path: string, body?: unknown, method?: string) => Promise<boolean>
  toast: (msg: string) => void
}

const TripCtx = createContext<Ctx | null>(null)
export const useTrip = () => {
  const c = useContext(TripCtx)
  if (!c) throw new Error('useTrip outside provider')
  return c
}

const cacheKey = (id: string) => `travel:state:${id}`
const POLL_MS = 30_000

export function TripProvider({
  tripId,
  children,
  fallback,
  onAuthError,
}: {
  tripId: string
  children: ReactNode
  fallback: (s: { error?: string; loading: boolean }) => ReactNode
  onAuthError: (msg: string) => void
}) {
  const session = sessions.get(tripId)
  const token = session?.token ?? ''
  const [state, setState] = useState<TripState | null>(() => local<TripState | null>(cacheKey(tripId), null))
  const [error, setError] = useState<string>()
  const [online, setOnline] = useState(navigator.onLine)
  const [toastMsg, setToastMsg] = useState<string>()
  const stateRef = useRef(state)
  stateRef.current = state
  const toastTimer = useRef<number>(undefined)

  const toast = useCallback((msg: string) => {
    setToastMsg(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToastMsg(undefined), 2600)
  }, [])

  const refresh = useCallback(async () => {
    if (!token) return
    try {
      const v = stateRef.current?.version ?? 0
      const res = await api<TripState | { unchanged: true; version: number }>(`/t/${tripId}/state?v=${v}`, { token })
      setOnline(true)
      if ('unchanged' in res) return
      setState(res)
      setLocal(cacheKey(tripId), res)
      sessions.save({ tripId, token, memberId: res.me, name: res.trip.name, theme: res.trip.theme, startDate: res.trip.startDate, endDate: res.trip.endDate, destination: res.trip.destination, invite: res.trip.inviteToken })
      setError(undefined)
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) onAuthError(e.message)
      else if (e instanceof ApiError && e.status === 0) setOnline(false)
      else setError((e as Error).message)
    }
  }, [tripId, token, onAuthError])

  useEffect(() => {
    if (!token) {
      onAuthError('這台裝置還沒加入這趟旅行')
      return
    }
    refresh()
    const id = window.setInterval(() => document.visibilityState === 'visible' && refresh(), POLL_MS)
    const vis = () => document.visibilityState === 'visible' && refresh()
    const on = () => {
      setOnline(true)
      refresh()
    }
    const off = () => setOnline(false)
    document.addEventListener('visibilitychange', vis)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', vis)
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [refresh, token, onAuthError])

  const handleErr = useCallback(
    (e: unknown) => {
      if (e instanceof ApiError && e.status === 0) setOnline(false)
      toast((e as Error).message)
      refresh()
    },
    [toast, refresh],
  )

  const save = useCallback<Ctx['save']>(
    async (kind, data, opts = {}) => {
      // 樂觀更新
      const tempId = opts.id ?? `tmp-${Math.random().toString(36).slice(2)}`
      setState((s) => {
        if (!s) return s
        const t = Date.now()
        const existing = s.entities.find((e) => e.id === tempId)
        const ent: Entity = existing
          ? { ...existing, data, updatedAt: t, updatedBy: s.me, deletedAt: null }
          : { id: tempId, kind, data, createdBy: s.me, updatedBy: s.me, createdAt: t, updatedAt: t, deletedAt: null }
        return { ...s, entities: existing ? s.entities.map((e) => (e.id === tempId ? ent : e)) : [...s.entities, ent] }
      })
      try {
        const res = await api<{ id: string }>(`/t/${tripId}/entities`, { token, body: { kind, id: opts.id, data, activity: opts.activity } })
        await refresh()
        return res.id
      } catch (e) {
        handleErr(e)
        setState((s) => (s && !opts.id ? { ...s, entities: s.entities.filter((x) => x.id !== tempId) } : s))
        return undefined
      }
    },
    [tripId, token, refresh, handleErr],
  )

  const remove = useCallback<Ctx['remove']>(
    async (id, activity) => {
      setState((s) => (s ? { ...s, entities: s.entities.map((e) => (e.id === id ? { ...e, deletedAt: Date.now() } : e)) } : s))
      try {
        await api(`/t/${tripId}/entities/${encodeURIComponent(id)}${activity ? `?activity=${encodeURIComponent(activity)}` : ''}`, { token, method: 'DELETE' })
        await refresh()
      } catch (e) {
        handleErr(e)
      }
    },
    [tripId, token, refresh, handleErr],
  )

  const call = useCallback<Ctx['call']>(
    async (path, body, method) => {
      try {
        await api(`/t/${tripId}${path}`, { token, body: body ?? {}, method })
        await refresh()
        return true
      } catch (e) {
        handleErr(e)
        return false
      }
    },
    [tripId, token, refresh, handleErr],
  )

  const restore = useCallback<Ctx['restore']>(async (id) => void (await call(`/entities/${encodeURIComponent(id)}/restore`)), [call])
  const patchTrip = useCallback<Ctx['patchTrip']>((body) => call('/trip', body, 'PATCH'), [call])

  const value = useMemo<Ctx | null>(() => {
    if (!state) return null
    const members = new Map(state.members.map((m) => [m.id, m]))
    const me = members.get(state.me) ?? state.members[0]
    return {
      state,
      token,
      me,
      online,
      readOnly: !online || !!state.trip.settings.closed,
      member: (id) => members.get(id),
      list: <K extends Kind>(kind: K) => state.entities.filter((e) => e.kind === kind && !e.deletedAt) as Entity<K>[],
      refresh,
      save,
      remove,
      restore,
      patchTrip,
      call,
      toast,
    }
  }, [state, token, online, refresh, save, remove, restore, patchTrip, call, toast])

  if (!value) return <>{fallback({ error, loading: !error })}</>
  return (
    <TripCtx.Provider value={value}>
      {children}
      {toastMsg && <div className="toast" role="status">{toastMsg}</div>}
    </TripCtx.Provider>
  )
}
