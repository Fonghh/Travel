import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { TripProvider, useTrip } from '../lib/store.tsx'
import { onLinkClick } from '../lib/router.ts'
import { local, sessions } from '../lib/session.ts'
import { Avatar } from '../components/ui.tsx'
import { countdownParts, myDeparture } from './helpers.ts'
import { HomeTab } from './HomeTab.tsx'
import { PlanTab } from './PlanTab.tsx'
import { MoneyTab } from './MoneyTab.tsx'
import { TodoTab } from './TodoTab.tsx'
import { StayTab } from './StayTab.tsx'
import { FeedTab, lastSeenKey } from './FeedTab.tsx'
import { SettingsSheet } from './SettingsSheet.tsx'

const MapTab = lazy(() => import('./MapTab.tsx'))

const TABS = [
  ['home', '首頁'],
  ['plan', '行程'],
  ['map', '地圖'],
  ['money', '記帳'],
  ['todo', '待辦'],
  ['stay', '住宿'],
  ['feed', '動態'],
] as const

export function TripShell({ tripId, tab }: { tripId: string; tab: string }) {
  const [authErr, setAuthErr] = useState<string>()
  const onAuthError = useCallback((msg: string) => setAuthErr(msg), [])
  if (authErr) {
    const invite = sessions.get(tripId)?.invite
    return (
      <main className="page stack lg">
        <div className="card stack center">
          <div style={{ fontSize: 40 }}>🔑</div>
          <p>{authErr}</p>
          {invite && <a className="btn coral" href={`/join/${invite}`}>重新加入</a>}
          <a className="btn white" href="/" onClick={onLinkClick}>回我的旅行</a>
        </div>
      </main>
    )
  }
  return (
    <TripProvider
      tripId={tripId}
      onAuthError={onAuthError}
      fallback={({ error }) => (
        <main className="page center stack">
          {error ? <div className="error">{error}</div> : <p className="muted" style={{ marginTop: 80 }}>行李打包中… 🧳</p>}
        </main>
      )}
    >
      <Shell tab={tab} />
    </TripProvider>
  )
}

function useCountdownLabel() {
  const { state } = useTrip()
  const [nowMs, setNow] = useState(Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])
  const dep = myDeparture(state)
  const end = new Date(state.trip.endDate + 'T23:59:59').getTime()
  if (nowMs < dep.at) {
    const c = countdownParts(dep.at - nowMs)
    return c.d ? `倒數 ${c.d} 天` : `倒數 ${c.h} 小時`
  }
  if (nowMs <= end) {
    const day = Math.floor((nowMs - new Date(state.trip.startDate + 'T00:00:00').getTime()) / 86400000) + 1
    return `第 ${Math.max(1, day)} 天`
  }
  return '旅行結束'
}

function Shell({ tab }: { tab: string }) {
  const { state, me, online } = useTrip()
  const [settings, setSettings] = useState(false)
  const label = useCountdownLabel()
  const lastSeen = local<number>(lastSeenKey(state.trip.id), 0)
  const unread = tab !== 'feed' && state.activity.some((a) => a.id > lastSeen && a.memberId !== me.id)
  const tabsRef = useRef<HTMLElement>(null)

  useEffect(() => {
    tabsRef.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ inline: 'center', block: 'nearest' })
  }, [tab])

  const base = `/t/${state.trip.id}`
  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <div className="topbar-title">
            <a className="home" href="/" onClick={onLinkClick} aria-label="我的旅行">🏠</a>
            <h1 className="grow ellipsis">{state.trip.name}</h1>
            <span className="countdown-chip">{label}</span>
            <button className="avatar-btn" onClick={() => setSettings(true)} aria-label="設定">
              <Avatar m={me} size={38} />
            </button>
          </div>
          <nav className="tabs" ref={tabsRef} aria-label="分頁">
            {TABS.map(([id, name]) => (
              <a key={id} href={`${base}/${id}`} onClick={onLinkClick} aria-current={tab === id ? 'page' : undefined}>
                {name}
                {id === 'feed' && unread && <span className="dot" aria-label="有新動態" />}
              </a>
            ))}
          </nav>
        </div>
      </header>
      <main className="page trip-page stack lg">
        {!online && <div className="banner warn">📴 目前離線，顯示的是最後一次同步的資料（只能看、不能改）</div>}
        {state.trip.settings.closed && <div className="banner">🎉 這趟旅行已結案，所有資料都只能查看</div>}
        {tab === 'home' && <HomeTab />}
        {tab === 'plan' && <PlanTab />}
        {tab === 'map' && (
          <Suspense fallback={<p className="muted center">地圖展開中… 🗺️</p>}>
            <MapTab />
          </Suspense>
        )}
        {tab === 'money' && <MoneyTab />}
        {tab === 'todo' && <TodoTab />}
        {tab === 'stay' && <StayTab />}
        {tab === 'feed' && <FeedTab />}
      </main>
      {settings && <SettingsSheet onClose={() => setSettings(false)} />}
    </>
  )
}
