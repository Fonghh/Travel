import { useEffect, useState } from 'react'
import type { Entity, FlightData } from '../../shared/types.ts'
import { Scene } from '../art/scenes.tsx'
import { AIRPORTS, TIMEZONES } from '../data.ts'
import { useTrip } from '../lib/store.tsx'
import { onLinkClick } from '../lib/router.ts'
import { durationText, fmtDate, todayIn, zonedToUtc } from '../lib/time.ts'
import { Empty, Field, inParticipants, ParticipantsPicker, ParticipantsView, Sheet } from '../components/ui.tsx'
import { countdownParts, myDeparture, sortItems } from './helpers.ts'

function Countdown() {
  const { state } = useTrip()
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000 * 20)
    return () => clearInterval(id)
  }, [])
  const dep = myDeparture(state)
  if (now >= dep.at) return null
  const c = countdownParts(dep.at - now)
  return (
    <div className="stack" style={{ gap: 6 }}>
      <p className="center small muted">距離你的 {dep.label} 還有</p>
      <div className="countdown" role="timer">
        <div className="cell" style={{ background: 'var(--coral)' }}><div className="num">{c.d}</div><span className="small">天</span></div>
        <div className="cell"><div className="num">{c.h}</div><span className="small">時</span></div>
        <div className="cell"><div className="num">{c.m}</div><span className="small">分</span></div>
      </div>
    </div>
  )
}

export function HomeTab() {
  const { state, list, me, member } = useTrip()
  const [showAll, setShowAll] = useState(false)
  const [edit, setEdit] = useState<Entity<'flight'> | 'new'>()
  const t = state.trip
  const pinned = list('announce').filter((a) => a.data.pinned).sort((a, b) => b.createdAt - a.createdAt)
  const flights = list('flight').sort((a, b) => zonedToUtc(a.data.depLocal, a.data.depTz) - zonedToUtc(b.data.depLocal, b.data.depTz))
  const mine = flights.filter((f) => inParticipants(f.data.participants, me.id))
  const shown = showAll ? flights : mine
  const today = todayIn()
  const todayItems = list('item').filter((i) => i.data.date === today && inParticipants(i.data.participants, me.id)).sort(sortItems)

  return (
    <>
      <div className="scene-wrap">
        <Scene theme={t.theme} />
      </div>
      <div className="center stack" style={{ gap: 2 }}>
        <h1>{t.name}</h1>
        <p className="muted">{t.destination}{t.destination && '・'}{fmtDate(t.startDate)} – {fmtDate(t.endDate)}</p>
      </div>
      <Countdown />

      {pinned.map((a) => (
        <div key={a.id} className="announce">
          <div className="small muted">📌 公告・{member(a.createdBy)?.name}</div>
          <div style={{ whiteSpace: 'pre-wrap' }}>{a.data.text}</div>
        </div>
      ))}

      {todayItems.length > 0 && (
        <a className="card green" href={`/t/${t.id}/plan`} onClick={onLinkClick} style={{ textDecoration: 'none' }}>
          <h3>☀️ 今天的行程</h3>
          {todayItems.slice(0, 4).map((i) => <div key={i.id} className="small">{i.data.time || '－'}　{i.data.title}</div>)}
        </a>
      )}

      <section className="stack">
        <div className="row between">
          <h2>✈️ 航班</h2>
          <div className="seg">
            <button aria-pressed={!showAll} onClick={() => setShowAll(false)}>我的</button>
            <button aria-pressed={showAll} onClick={() => setShowAll(true)}>大家的</button>
          </div>
        </div>
        {!shown.length && <Empty icon="🛫">{showAll ? '還沒有人加航班' : '還沒有你的航班，加一下吧！'}</Empty>}
        {shown.map((f) => <FlightCard key={f.id} f={f} onEdit={() => setEdit(f)} />)}
        <button className="btn white block" onClick={() => setEdit('new')}>＋ 新增航班</button>
      </section>
      {edit && <FlightEditor flight={edit === 'new' ? undefined : edit} onClose={() => setEdit(undefined)} />}
    </>
  )
}

function hm(local: string) {
  return local.split('T')[1] ?? ''
}

function FlightCard({ f, onEdit }: { f: Entity<'flight'>; onEdit: () => void }) {
  const { state, readOnly } = useTrip()
  const d = f.data
  const dur = d.depLocal && d.arrLocal ? zonedToUtc(d.arrLocal, d.arrTz) - zonedToUtc(d.depLocal, d.depTz) : 0
  return (
    <article className="boarding">
      <div className="main">
        <div className="head">
          <span>✈️ {d.airline} {d.flightNo}</span>
          <span className="grow" />
          <span>{d.depLocal && fmtDate(d.depLocal.slice(0, 10))}</span>
        </div>
        <div className="route">
          <div>
            <div className="code">{d.from || '—'}</div>
            <div className="small">{AIRPORTS[d.from]?.name}</div>
            <div>{hm(d.depLocal)}</div>
          </div>
          <div className="plane-line"><span>✈︎</span></div>
          <div style={{ textAlign: 'right' }}>
            <div className="code">{d.to || '—'}</div>
            <div className="small">{AIRPORTS[d.to]?.name}</div>
            <div>{hm(d.arrLocal)}{d.arrLocal.slice(0, 10) !== d.depLocal.slice(0, 10) && d.arrLocal ? ' +1' : ''}</div>
          </div>
        </div>
        {dur > 0 && <div className="small muted center">飛行 {durationText(dur)}（皆為當地時間）</div>}
        <div className="row between" style={{ marginTop: 8 }}>
          <ParticipantsView p={d.participants} members={state.members} />
          {!readOnly && <button className="btn white sm" onClick={onEdit}>編輯</button>}
        </div>
      </div>
      <div className="stub">
        <div className="small">航廈</div><b>{d.terminal || '—'}</b>
        <div className="small">登機門</div><b>{d.gate || '—'}</b>
        <div className="small">座位</div><b>{d.seat || '—'}</b>
        {d.bookingRef && <><div className="small">訂位代號</div><b style={{ fontSize: '0.8rem' }}>{d.bookingRef}</b></>}
      </div>
    </article>
  )
}

function FlightEditor({ flight, onClose }: { flight?: Entity<'flight'>; onClose: () => void }) {
  const { state, me, save, remove } = useTrip()
  const [d, setD] = useState<FlightData>(
    flight?.data ?? {
      airline: '', flightNo: '', from: 'TPE', to: '', depLocal: `${state.trip.startDate}T08:00`, depTz: 'Asia/Taipei',
      arrLocal: `${state.trip.startDate}T12:00`, arrTz: 'Asia/Tokyo', participants: [me.id],
    },
  )
  const set = <K extends keyof FlightData>(k: K, v: FlightData[K]) => setD((x) => ({ ...x, [k]: v }))
  const setAirport = (k: 'from' | 'to', code: string) => {
    const c = code.toUpperCase().slice(0, 3)
    setD((x) => ({ ...x, [k]: c, ...(AIRPORTS[c] ? { [k === 'from' ? 'depTz' : 'arrTz']: AIRPORTS[c].tz } : {}) }))
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const label = `${d.flightNo || '航班'} ${d.from}→${d.to}`
    onClose()
    await save('flight', d, { id: flight?.id, activity: `${flight ? '修改' : '新增'}了航班 ✈️ ${label}` })
  }
  const tzSelect = (k: 'depTz' | 'arrTz') => (
    <select value={d[k]} onChange={(e) => set(k, e.target.value)}>
      {TIMEZONES.map(([v, n]) => <option key={v} value={v}>{n}</option>)}
    </select>
  )
  return (
    <Sheet title={flight ? '編輯航班' : '新增航班'} onClose={onClose}>
      <form className="stack" onSubmit={submit}>
        <datalist id="airports">
          {Object.entries(AIRPORTS).map(([c, a]) => <option key={c} value={c}>{a.name}</option>)}
        </datalist>
        <div className="grid2">
          <Field label="航空公司"><input value={d.airline} onChange={(e) => set('airline', e.target.value)} placeholder="長榮航空" /></Field>
          <Field label="航班號"><input value={d.flightNo} onChange={(e) => set('flightNo', e.target.value.toUpperCase())} placeholder="BR198" /></Field>
          <Field label="出發機場"><input list="airports" value={d.from} onChange={(e) => setAirport('from', e.target.value)} placeholder="TPE" /></Field>
          <Field label="抵達機場"><input list="airports" value={d.to} onChange={(e) => setAirport('to', e.target.value)} placeholder="NRT" /></Field>
        </div>
        <Field label="起飛（當地時間）"><input type="datetime-local" required value={d.depLocal} onChange={(e) => set('depLocal', e.target.value)} /></Field>
        <Field label="起飛地時區">{tzSelect('depTz')}</Field>
        <Field label="抵達（當地時間）"><input type="datetime-local" required value={d.arrLocal} onChange={(e) => set('arrLocal', e.target.value)} /></Field>
        <Field label="抵達地時區">{tzSelect('arrTz')}</Field>
        <div className="grid2">
          <Field label="航廈"><input value={d.terminal ?? ''} onChange={(e) => set('terminal', e.target.value)} /></Field>
          <Field label="登機門"><input value={d.gate ?? ''} onChange={(e) => set('gate', e.target.value)} /></Field>
          <Field label="座位"><input value={d.seat ?? ''} onChange={(e) => set('seat', e.target.value)} /></Field>
          <Field label="訂位代號"><input value={d.bookingRef ?? ''} onChange={(e) => set('bookingRef', e.target.value.toUpperCase())} /></Field>
        </div>
        <span className="small">誰搭這班？</span>
        <ParticipantsPicker value={d.participants} onChange={(p) => set('participants', p)} members={state.members} me={me.id} />
        <button className="btn coral block">儲存</button>
        {flight && (
          <button type="button" className="btn ghost block" onClick={() => { onClose(); remove(flight.id, `刪除了航班 ${d.flightNo}`) }}>
            🗑 刪除這個航班
          </button>
        )}
      </form>
    </Sheet>
  )
}
