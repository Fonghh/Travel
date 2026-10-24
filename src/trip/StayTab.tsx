import { useState } from 'react'
import type { Entity, StayData } from '../../shared/types.ts'
import { useTrip } from '../lib/store.tsx'
import { fmtDate, nightsBetween } from '../lib/time.ts'
import { Empty, Field, inParticipants, ParticipantsPicker, ParticipantsView, Sheet } from '../components/ui.tsx'
import { mapsLink } from './helpers.ts'
import { PlaceInput } from './PlaceInput.tsx'

export function StayTab() {
  const { list, me, readOnly } = useTrip()
  const [edit, setEdit] = useState<Entity<'stay'> | 'new'>()
  const [onlyMine, setOnlyMine] = useState(false)
  const stays = list('stay')
    .filter((s) => !onlyMine || inParticipants(s.data.participants, me.id))
    .sort((a, b) => a.data.checkIn.localeCompare(b.data.checkIn))
  return (
    <>
      <div className="row between">
        <h2>🏨 住宿</h2>
        <div className="seg">
          <button aria-pressed={!onlyMine} onClick={() => setOnlyMine(false)}>全部</button>
          <button aria-pressed={onlyMine} onClick={() => setOnlyMine(true)}>我住的</button>
        </div>
      </div>
      {!stays.length && <Empty icon="🛏️">還沒有住宿資訊。貼上訂房的 Google Maps 網址就能快速新增！</Empty>}
      {stays.map((s) => <StayCard key={s.id} s={s} onEdit={() => setEdit(s)} />)}
      {!readOnly && <button className="fab" onClick={() => setEdit('new')} aria-label="新增住宿">＋</button>}
      {edit && <StayEditor stay={edit === 'new' ? undefined : edit} onClose={() => setEdit(undefined)} />}
    </>
  )
}

function StayCard({ s, onEdit }: { s: Entity<'stay'>; onEdit: () => void }) {
  const { state, readOnly } = useTrip()
  const d = s.data
  const nights = nightsBetween(d.checkIn, d.checkOut)
  const link = mapsLink(d)
  return (
    <article className="card stack" style={{ gap: 8 }}>
      <div className="row between" style={{ alignItems: 'flex-start' }}>
        <div className="grow">
          <h3>{d.name}</h3>
          <div className="small muted">{nights} 晚</div>
        </div>
        <ParticipantsView p={d.participants} members={state.members} />
      </div>
      <div className="grid2">
        <div className="card flat mizu" style={{ padding: 10 }}>
          <div className="small">入住</div>
          <b>{fmtDate(d.checkIn)}</b>
          <div className="small">{d.checkInTime || '—'}</div>
        </div>
        <div className="card flat coral" style={{ padding: 10 }}>
          <div className="small">退房</div>
          <b>{fmtDate(d.checkOut)}</b>
          <div className="small">{d.checkOutTime || '—'}</div>
        </div>
      </div>
      {d.address && <div className="small">📍 {d.address}</div>}
      <div className="row wrap small" style={{ gap: 12 }}>
        {d.bookingRef && <span>🎫 訂房代號 <b>{d.bookingRef}</b></span>}
        {d.room && <span>🚪 {d.room}</span>}
        {d.phone && <a href={`tel:${d.phone}`}>📞 {d.phone}</a>}
      </div>
      {d.note && <div className="small" style={{ whiteSpace: 'pre-wrap' }}>{d.note}</div>}
      <div className="row wrap" style={{ gap: 6 }}>
        {link && <a className="btn white sm" href={link} target="_blank" rel="noreferrer">📍 地圖</a>}
        {d.url && d.url !== link && <a className="btn white sm" href={d.url} target="_blank" rel="noreferrer">🔗 訂房頁</a>}
        {!readOnly && <button className="btn white sm" onClick={onEdit}>編輯</button>}
      </div>
    </article>
  )
}

function StayEditor({ stay, onClose }: { stay?: Entity<'stay'>; onClose: () => void }) {
  const { state, me, save, remove } = useTrip()
  const t = state.trip
  const [d, setD] = useState<StayData>(stay?.data ?? { name: '', checkIn: t.startDate, checkOut: t.endDate, checkInTime: '15:00', checkOutTime: '10:00', participants: 'all' })
  const set = <K extends keyof StayData>(k: K, v: StayData[K]) => setD((x) => ({ ...x, [k]: v }))
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (d.checkOut < d.checkIn) return
    onClose()
    await save('stay', d, { id: stay?.id, activity: `${stay ? '修改' : '新增'}了住宿「${d.name}」🏨` })
  }
  return (
    <Sheet title={stay ? '編輯住宿' : '新增住宿'} onClose={onClose}>
      <form className="stack" onSubmit={submit}>
        <PlaceInput value={d} onPick={(p) => setD((x) => ({ ...x, name: x.name || p.name || '', lat: p.lat, lng: p.lng, url: p.url ?? x.url }))} />
        <Field label="住宿名稱"><input required maxLength={80} value={d.name} onChange={(e) => set('name', e.target.value)} placeholder="NASPA New Otani" /></Field>
        <div className="grid2">
          <Field label="入住日"><input type="date" required value={d.checkIn} onChange={(e) => set('checkIn', e.target.value)} /></Field>
          <Field label="入住時間"><input type="time" value={d.checkInTime ?? ''} onChange={(e) => set('checkInTime', e.target.value)} /></Field>
          <Field label="退房日"><input type="date" required min={d.checkIn} value={d.checkOut} onChange={(e) => set('checkOut', e.target.value)} /></Field>
          <Field label="退房時間"><input type="time" value={d.checkOutTime ?? ''} onChange={(e) => set('checkOutTime', e.target.value)} /></Field>
        </div>
        <Field label="地址"><input value={d.address ?? ''} onChange={(e) => set('address', e.target.value)} /></Field>
        <div className="grid2">
          <Field label="訂房代號"><input value={d.bookingRef ?? ''} onChange={(e) => set('bookingRef', e.target.value)} /></Field>
          <Field label="電話"><input type="tel" value={d.phone ?? ''} onChange={(e) => set('phone', e.target.value)} /></Field>
        </div>
        <Field label="房型／房號"><input value={d.room ?? ''} onChange={(e) => set('room', e.target.value)} placeholder="和室 4 人房 ×3" /></Field>
        <span className="small">誰住這裡？</span>
        <ParticipantsPicker value={d.participants} onChange={(p) => set('participants', p)} members={state.members} me={me.id} />
        <Field label="備註"><textarea value={d.note ?? ''} onChange={(e) => set('note', e.target.value)} placeholder="含早餐、有接駁車…" /></Field>
        <Field label="訂房網址"><input type="url" value={d.url ?? ''} onChange={(e) => set('url', e.target.value)} /></Field>
        <button className="btn coral block">儲存</button>
        {stay && <button type="button" className="btn ghost block" onClick={() => { onClose(); remove(stay.id, `刪除了住宿「${d.name}」`) }}>🗑 刪除</button>}
      </form>
    </Sheet>
  )
}
