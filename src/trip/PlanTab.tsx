import { useMemo, useState } from 'react'
import type { Entity, ItemData } from '../../shared/types.ts'
import { MOODS, RECOMMEND, TRANSPORTS, transportInfo } from '../data.ts'
import { useTrip } from '../lib/store.tsx'
import { dateRange, fmtDate, todayIn, weekday } from '../lib/time.ts'
import { Avatar, Empty, Field, inParticipants, ParticipantsPicker, ParticipantsView, Sheet } from '../components/ui.tsx'
import { mapsLink, nearbyLink, sortItems } from './helpers.ts'
import { PlaceInput } from './PlaceInput.tsx'

export type MemberFilter = 'all' | 'me' | string

export function useDates() {
  const { state, list } = useTrip()
  return useMemo(() => {
    const set = new Set(dateRange(state.trip.startDate, state.trip.endDate))
    for (const i of list('item')) set.add(i.data.date)
    return [...set].sort()
  }, [state.trip.startDate, state.trip.endDate, list])
}

export function DateStrip({ dates, value, onChange, marks }: { dates: string[]; value: string; onChange: (d: string) => void; marks?: Set<string> }) {
  return (
    <div className="date-strip" role="tablist" aria-label="選擇日期">
      {dates.map((d) => (
        <button
          key={d}
          className={'date-pill' + (marks?.has(d) ? ' has' : '')}
          aria-pressed={d === value}
          onClick={() => onChange(d)}
          ref={(el) => {
            if (el && d === value) el.scrollIntoView({ inline: 'center', block: 'nearest' })
          }}
        >
          <div className="w">{d.slice(5, 7).replace(/^0/, '')}月</div>
          <div className="d">{Number(d.slice(8))}</div>
          <div className="w">週{weekday(d)}</div>
        </button>
      ))}
    </div>
  )
}

export function MemberFilterBar({ value, onChange }: { value: MemberFilter; onChange: (v: MemberFilter) => void }) {
  const { state, me } = useTrip()
  const others = state.members.filter((m) => m.id !== me.id)
  return (
    <div className="row" style={{ gap: 6 }}>
      <div className="seg">
        <button aria-pressed={value === 'all'} onClick={() => onChange('all')}>全部</button>
        <button aria-pressed={value === 'me'} onClick={() => onChange('me')}>只看我</button>
      </div>
      {others.length > 0 && (
        <select
          className="input"
          style={{ minHeight: 36, padding: '2px 10px', width: 'auto', borderWidth: 2.5, background: value !== 'all' && value !== 'me' ? 'var(--yellow)' : undefined }}
          value={value !== 'all' && value !== 'me' ? value : ''}
          onChange={(e) => onChange(e.target.value || 'all')}
          aria-label="看某人"
        >
          <option value="">看某人…</option>
          {others.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      )}
    </div>
  )
}

export function matchFilter(p: ItemData['participants'], f: MemberFilter, me: string) {
  if (f === 'all') return true
  return inParticipants(p, f === 'me' ? me : f)
}

export function PlanTab() {
  const { state, list, me, readOnly } = useTrip()
  const dates = useDates()
  const today = todayIn()
  const [date, setDate] = useState(() => sessionStorage.getItem('plan:date') ?? (dates.includes(today) ? today : dates[0]))
  const [filter, setFilter] = useState<MemberFilter>('all')
  const [edit, setEdit] = useState<Entity<'item'> | 'new'>()
  const [rec, setRec] = useState<Entity<'item'>>()
  const [checkin, setCheckin] = useState<Entity<'item'>>()
  const current = dates.includes(date) ? date : dates[0]
  const pickDate = (d: string) => {
    setDate(d)
    try {
      sessionStorage.setItem('plan:date', d)
    } catch {
      /* 忽略 */
    }
  }

  const items = list('item')
  const marks = new Set(items.filter((i) => matchFilter(i.data.participants, filter, me.id)).map((i) => i.data.date))
  const dayItems = items.filter((i) => i.data.date === current && matchFilter(i.data.participants, filter, me.id)).sort(sortItems)
  const stays = list('stay').filter((s) => s.data.checkIn <= current && current < s.data.checkOut && matchFilter(s.data.participants, filter, me.id))

  return (
    <>
      <DateStrip dates={dates} value={current} onChange={pickDate} marks={marks} />
      <div className="row between wrap">
        <h2>{fmtDate(current)}</h2>
        <MemberFilterBar value={filter} onChange={setFilter} />
      </div>
      <div key={current + filter} className="timeline">
        {!dayItems.length && <Empty icon="🗺️">這天還沒有行程。<br />說走就走，按右下角＋加一個吧！</Empty>}
        {dayItems.map((it, idx) => (
          <TimelineItem key={it.id} it={it} index={idx} onEdit={() => setEdit(it)} onRecommend={() => setRec(it)} onCheckin={() => setCheckin(it)} />
        ))}
        {stays.map((s) => (
          <div key={s.id} className="tl-item" style={{ animationDelay: `${dayItems.length * 60}ms` }}>
            <div className="card mizu flat">
              <div className="row">
                <span>🏨</span>
                <div className="grow"><div className="small muted">今晚住</div>{s.data.name}</div>
                <ParticipantsView p={s.data.participants} members={state.members} />
              </div>
            </div>
          </div>
        ))}
      </div>
      {!readOnly && <button className="fab" onClick={() => setEdit('new')} aria-label="新增行程">＋</button>}
      {edit && <ItemEditor item={edit === 'new' ? undefined : edit} date={current} onClose={() => setEdit(undefined)} />}
      {rec && <RecommendSheet item={rec} onClose={() => setRec(undefined)} />}
      {checkin && <CheckinSheet item={checkin} onClose={() => setCheckin(undefined)} />}
    </>
  )
}

function TimelineItem({ it, index, onEdit, onRecommend, onCheckin }: { it: Entity<'item'>; index: number; onEdit: () => void; onRecommend: () => void; onCheckin: () => void }) {
  const { state, me, member, list, readOnly } = useTrip()
  const d = it.data
  const tr = transportInfo(d.transport)
  const checkins = list('checkin').filter((c) => c.data.itemId === it.id)
  const mineIn = inParticipants(d.participants, me.id)
  const iChecked = checkins.some((c) => c.data.memberId === me.id)
  const expenses = list('expense').filter((e) => e.data.itemId === it.id)
  const cls = ['tl-item', d.participants !== 'all' && 'branch', d.mustGo && 'must', d.meetup && 'meetup', checkins.length && 'visited', !mineIn && 'other']
    .filter(Boolean)
    .join(' ')
  const link = mapsLink(d)
  return (
    <div className={cls} style={{ animationDelay: `${index * 60}ms` }}>
      {d.transport !== 'none' && (
        <div className="transport-hop">
          <span className="tag" style={{ background: tr.color }}>{tr.icon} {tr.label}</span>
        </div>
      )}
      <div className="card" style={{ marginTop: d.transport !== 'none' ? 10 : 0 }}>
        <div className="row between" style={{ alignItems: 'flex-start' }}>
          <div className="grow">
            <div className="tl-time">{d.time || '—'}{d.endTime ? ` – ${d.endTime}` : ''}</div>
            <div className="tl-title">{d.title}</div>
          </div>
          <ParticipantsView p={d.participants} members={state.members} />
        </div>
        <div className="row wrap" style={{ gap: 6, marginTop: 6 }}>
          {d.mustGo && <span className="tag must">⭐ 必去</span>}
          {d.meetup && <span className="tag meet">🚩 會合點</span>}
          {expenses.length > 0 && <span className="tag">💴 {expenses.length} 筆花費</span>}
        </div>
        {d.placeName && d.placeName !== d.title && <div className="small muted" style={{ marginTop: 4 }}>📍 {d.placeName}</div>}
        {d.note && <div className="small" style={{ whiteSpace: 'pre-wrap', marginTop: 4 }}>{d.note}</div>}
        {checkins.length > 0 && (
          <div className="checkins">
            {checkins.map((c) => (
              <span key={c.id} className="checkin">
                <Avatar m={member(c.data.memberId)} size={22} />
                {c.data.mood} {c.data.text}
              </span>
            ))}
          </div>
        )}
        <div className="tl-actions">
          <button className="btn sm" onClick={onRecommend}>🍜 吃喝玩樂</button>
          {link && <a className="btn white sm" href={link} target="_blank" rel="noreferrer">📍 地圖</a>}
          {d.url && d.url !== link && <a className="btn white sm" href={d.url} target="_blank" rel="noreferrer">🔗 連結</a>}
          {!readOnly && mineIn && <button className={'btn sm ' + (iChecked ? 'green' : 'white')} onClick={onCheckin}>{iChecked ? '✔ 去過了' : '✔ 我去了'}</button>}
          {!readOnly && <button className="btn white sm" onClick={onEdit} aria-label="編輯">✏️</button>}
        </div>
      </div>
    </div>
  )
}

function ItemEditor({ item, date, onClose }: { item?: Entity<'item'>; date: string; onClose: () => void }) {
  const { state, me, save, remove } = useTrip()
  const [d, setD] = useState<ItemData>(item?.data ?? { date, time: '', title: '', transport: 'train', participants: 'all' })
  const set = <K extends keyof ItemData>(k: K, v: ItemData[K]) => setD((x) => ({ ...x, [k]: v }))
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!d.title.trim()) return
    onClose()
    await save('item', d, { id: item?.id, activity: `${item ? '修改' : '新增'}了${d.participants === 'all' ? '' : '支線'}行程「${d.title}」（${fmtDate(d.date, false)}）` })
  }
  return (
    <Sheet title={item ? '編輯行程' : '新增行程'} onClose={onClose}>
      <form className="stack" onSubmit={submit}>
        <PlaceInput
          value={d}
          onPick={(p) => setD((x) => ({ ...x, title: x.title || p.name || '', placeName: p.name ?? x.placeName, lat: p.lat, lng: p.lng, url: p.url ?? x.url }))}
        />
        <Field label="名稱"><input required maxLength={80} value={d.title} onChange={(e) => set('title', e.target.value)} placeholder="築地場外市場吃早餐" /></Field>
        <div className="grid2">
          <Field label="日期"><input type="date" required value={d.date} onChange={(e) => set('date', e.target.value)} /></Field>
          <Field label="開始時間"><input type="time" value={d.time} onChange={(e) => set('time', e.target.value)} /></Field>
        </div>
        <Field label="結束時間（可不填）"><input type="time" value={d.endTime ?? ''} onChange={(e) => set('endTime', e.target.value)} /></Field>
        <span className="small">怎麼過去？</span>
        <div className="seg">
          {TRANSPORTS.map((t) => (
            <button key={t.id} type="button" aria-pressed={d.transport === t.id} onClick={() => set('transport', t.id)} style={d.transport === t.id ? { background: t.color } : undefined}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
        <div className="row wrap" style={{ gap: 16 }}>
          <label className="check"><input type="checkbox" checked={!!d.mustGo} onChange={(e) => set('mustGo', e.target.checked)} /> ⭐ 必去</label>
          <label className="check"><input type="checkbox" checked={!!d.meetup} onChange={(e) => set('meetup', e.target.checked)} /> 🚩 會合點</label>
        </div>
        <span className="small">誰參加？</span>
        <ParticipantsPicker value={d.participants} onChange={(p) => set('participants', p)} members={state.members} me={me.id} />
        <Field label="備註"><textarea value={d.note ?? ''} onChange={(e) => set('note', e.target.value)} placeholder="要先預約、記得帶現金…" /></Field>
        <Field label="相關連結"><input type="url" value={d.url ?? ''} onChange={(e) => set('url', e.target.value)} placeholder="https://" /></Field>
        <button className="btn coral block">儲存</button>
        {item && (
          <button type="button" className="btn ghost block" onClick={() => { onClose(); remove(item.id, `刪除了行程「${d.title}」`) }}>🗑 刪除（7 天內可還原）</button>
        )}
      </form>
    </Sheet>
  )
}

function RecommendSheet({ item, onClose }: { item: Entity<'item'>; onClose: () => void }) {
  const { state } = useTrip()
  const d = item.data
  return (
    <Sheet title="🍜 吃喝玩樂" onClose={onClose}>
      <div className="stack">
        <p className="muted small">在「{d.placeName || d.title}」附近找找看，會打開 Google Maps：</p>
        {RECOMMEND.map((cat) => (
          <div key={cat.id} className="card flat" style={{ background: cat.color, padding: 12 }}>
            <h3 style={{ marginBottom: 8 }}>{cat.icon} {cat.label}</h3>
            <div className="row wrap" style={{ gap: 6 }}>
              {cat.subs.map((s) => (
                <a key={s.label} className="btn white sm" href={nearbyLink(state.trip.theme, s, d)} target="_blank" rel="noreferrer">{s.label}</a>
              ))}
            </div>
          </div>
        ))}
        <p className="small muted center">🤖 AI 推薦（Gemini）即將推出</p>
      </div>
    </Sheet>
  )
}

function CheckinSheet({ item, onClose }: { item: Entity<'item'>; onClose: () => void }) {
  const { me, list, save, remove } = useTrip()
  const id = `${item.id}:${me.id}`
  const existing = list('checkin').find((c) => c.id === id)
  const [mood, setMood] = useState(existing?.data.mood ?? '😋')
  const [text, setText] = useState(existing?.data.text ?? '')
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    onClose()
    await save('checkin', { itemId: item.id, memberId: me.id, mood, text: text.trim() }, { id, activity: `在「${item.data.title}」打卡 ${mood}${text.trim() ? `：${text.trim()}` : ''}` })
  }
  return (
    <Sheet title={`✔ 我去了：${item.data.title}`} onClose={onClose}>
      <form className="stack" onSubmit={submit}>
        <span className="small">心情貼紙</span>
        <div className="row wrap">
          {MOODS.map((m) => (
            <button key={m} type="button" className="icon-btn" style={{ width: 52, height: 52, fontSize: 26, background: mood === m ? 'var(--yellow)' : undefined }} aria-pressed={mood === m} onClick={() => setMood(m)}>{m}</button>
          ))}
        </div>
        <Field label="說一句話（可不填）"><input maxLength={60} value={text} onChange={(e) => setText(e.target.value)} placeholder="玉子燒超讚！" /></Field>
        <button className="btn green block">打卡！</button>
        {existing && <button type="button" className="btn ghost block" onClick={() => { onClose(); remove(id) }}>取消打卡</button>}
      </form>
    </Sheet>
  )
}
