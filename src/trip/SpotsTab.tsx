import { useMemo, useState } from 'react'
import type { Entity, ItemData, Participants, SpotCategory, SpotData, TripState } from '../../shared/types.ts'
import { areaQueries, extractPlaces } from '../../shared/extract.ts'
import type { ExtractedPlace } from '../../shared/extract.ts'
import { guessSpotCategory, SPOT_CATS, spotCat, TRANSPORTS } from '../data.ts'
import { api } from '../lib/api.ts'
import { useTrip } from '../lib/store.tsx'
import { ago, fmtDate } from '../lib/time.ts'
import { Avatar, AvatarStack, Empty, Field, ParticipantsPicker, Sheet } from '../components/ui.tsx'
import { mapsLink } from './helpers.ts'
import { useDates } from './PlanTab.tsx'
import { PlaceInput } from './PlaceInput.tsx'

/** 行程與住宿座標的中心，用來優先找附近的同名地點 */
export function tripCenter(s: TripState): { lat: number; lng: number } | undefined {
  const pts = s.entities
    .filter((e) => !e.deletedAt && (e.kind === 'item' || e.kind === 'stay' || e.kind === 'spot'))
    .map((e) => e.data as { lat?: number; lng?: number })
    .filter((d) => d.lat != null && d.lng != null)
  if (!pts.length) return undefined
  return { lat: pts.reduce((a, p) => a + p.lat!, 0) / pts.length, lng: pts.reduce((a, p) => a + p.lng!, 0) / pts.length }
}

function googleSearch(q: string, near?: { lat: number; lng: number }) {
  return near
    ? `https://www.google.com/maps/search/${encodeURIComponent(q)}/@${near.lat},${near.lng},11z`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`
}

type Sort = 'votes' | 'new'

export function SpotsTab() {
  const { list, me, member, save, remove, readOnly } = useTrip()
  const [adding, setAdding] = useState(false)
  const [edit, setEdit] = useState<Entity<'spot'>>()
  const [scheduling, setScheduling] = useState<Entity<'spot'>>()
  const [cat, setCat] = useState<SpotCategory | 'all'>('all')
  const [sort, setSort] = useState<Sort>('votes')
  const [hideScheduled, setHideScheduled] = useState(false)

  const votes = list('vote')
  const items = list('item')
  const votesOf = (id: string) => votes.filter((v) => v.data.spotId === id).map((v) => v.data.memberId)
  const scheduledItem = (s: Entity<'spot'>) => (s.data.scheduledItemId ? items.find((i) => i.id === s.data.scheduledItemId) : undefined)
  const spots = list('spot')
    .filter((s) => cat === 'all' || s.data.category === cat)
    .filter((s) => !hideScheduled || !scheduledItem(s))
    .sort((a, b) => (sort === 'votes' ? votesOf(b.id).length - votesOf(a.id).length : 0) || b.createdAt - a.createdAt)

  return (
    <>
      <div className="row between">
        <div>
          <h2>⭐ 口袋名單</h2>
          <p className="small muted">還沒決定哪天去的地方，大家一起投票</p>
        </div>
        {!readOnly && <button className="btn coral sm" onClick={() => setAdding(true)}>＋ 加地點</button>}
      </div>
      <div className="seg">
        <button aria-pressed={cat === 'all'} onClick={() => setCat('all')}>全部</button>
        {SPOT_CATS.map((c) => <button key={c.id} aria-pressed={cat === c.id} onClick={() => setCat(c.id)}>{c.icon} {c.label}</button>)}
      </div>
      <div className="row between small">
        <div className="seg">
          <button aria-pressed={sort === 'votes'} onClick={() => setSort('votes')}>🔥 人氣</button>
          <button aria-pressed={sort === 'new'} onClick={() => setSort('new')}>🆕 最新</button>
        </div>
        <label className="check small"><input type="checkbox" checked={hideScheduled} onChange={(e) => setHideScheduled(e.target.checked)} /> 隱藏已排入</label>
      </div>

      {!spots.length && <Empty icon="🌟">還沒有口袋地點。<br />看到想去的 Reels？截圖複製文字，按「＋ 加地點」貼上！</Empty>}
      <div className="list">
        {spots.map((s) => {
          const d = s.data
          const c = spotCat(d.category)
          const v = votesOf(s.id)
          const mine = v.includes(me.id)
          const it = scheduledItem(s)
          const link = mapsLink({ ...d, name: d.title })
          return (
            <article key={s.id} className="card" style={{ padding: 12, opacity: it ? 0.75 : 1 }}>
              <div className="row" style={{ alignItems: 'flex-start' }}>
                <span className="avatar" style={{ width: 38, height: 38, background: c.color, fontSize: 20 }}>{c.icon}</span>
                <div className="grow">
                  <div className="tl-title">{d.title}</div>
                  <div className="small muted row" style={{ gap: 4 }}>
                    <Avatar m={member(s.createdBy)} size={18} /> {member(s.createdBy)?.name}・{ago(s.createdAt)}
                    {d.lat == null && ' ・❓ 沒座標'}
                  </div>
                </div>
                {!readOnly && (
                  <div className="row" style={{ gap: 4 }}>
                    <button className="icon-btn sm" onClick={() => setEdit(s)} aria-label="編輯">✏️</button>
                    {(s.createdBy === me.id || me.role === 'leader') && (
                      <button
                        className="icon-btn sm"
                        aria-label="刪除"
                        onClick={() => confirm(`要把「${d.title}」移出口袋名單嗎？（7 天內可在設定裡還原）`) && remove(s.id, `把「${d.title}」移出口袋名單`)}
                      >
                        🗑
                      </button>
                    )}
                  </div>
                )}
              </div>
              {d.note && <div className="small" style={{ whiteSpace: 'pre-wrap', marginTop: 6 }}>{d.note}</div>}
              {it && <div className="tag" style={{ marginTop: 6, background: 'var(--green)' }}>✅ 已排入 {fmtDate(it.data.date)}{it.data.time && ` ${it.data.time}`}</div>}
              <div className="row wrap" style={{ gap: 6, marginTop: 8 }}>
                <button
                  className={'btn sm ' + (mine ? '' : 'white')}
                  disabled={readOnly}
                  onClick={() => (mine ? remove(`${s.id}:${me.id}`) : save('vote', { spotId: s.id, memberId: me.id }, { id: `${s.id}:${me.id}` }))}
                >
                  🙋 想去 {v.length > 0 && v.length}
                </button>
                {v.length > 0 && <AvatarStack members={v.map((id) => member(id)!).filter(Boolean)} size={22} max={5} />}
                <span className="grow" />
                {link && <a className="btn white sm" href={link} target="_blank" rel="noreferrer">📍</a>}
                {d.source && <a className="btn white sm" href={d.source} target="_blank" rel="noreferrer" aria-label="來源">🔗</a>}
                {!readOnly && !it && <button className="btn white sm" onClick={() => setScheduling(s)}>📅 排進行程</button>}
              </div>
            </article>
          )
        })}
      </div>
      {adding && <AddSpotsSheet onClose={() => setAdding(false)} />}
      {edit && <SpotEditor spot={edit} onClose={() => setEdit(undefined)} />}
      {scheduling && <ScheduleSheet spot={scheduling} onClose={() => setScheduling(undefined)} />}
    </>
  )
}

interface Candidate extends ExtractedPlace {
  key: number
  checked: boolean
  category: SpotCategory
  status: 'coords' | 'locating' | 'found' | 'notfound' | 'manual' | 'waiting' | 'guess' | 'picked'
  confidence?: 'high' | 'medium'
  source?: string
  guesses?: Guess[]
}

interface Guess { lat: number; lng: number; source: string; query: string }

function AddSpotsSheet({ onClose }: { onClose: () => void }) {
  const { state, token, save, toast } = useTrip()
  const [mode, setMode] = useState<'text' | 'link' | 'single'>('text')
  const [reel, setReel] = useState<ReelResult & { url: string }>()
  const [reelErr, setReelErr] = useState('')
  const [text, setText] = useState('')
  const [source, setSource] = useState('')
  const [cands, setCands] = useState<Candidate[]>([])
  const [busy, setBusy] = useState(false)
  const near = useMemo(() => tripCenter(state), [state])
  const update = (key: number, patch: Partial<Candidate>) => setCands((cs) => cs.map((c) => (c.key === key ? { ...c, ...patch } : c)))

  async function analyze(input = text, preset?: ExtractedPlace[]) {
    // 只貼了一個社群貼文連結：改走 Gemini 找文字
    const only = input.trim()
    if (!preset && /^https?:\/\/\S+$/.test(only) && SOCIAL.test(only)) {
      setMode('link')
      return findReel(only)
    }
    const extracted = extractPlaces(input)
    const places = preset?.length ? preset : extracted.places
    const urls = extracted.urls
    if (!source && urls[0]) setSource(urls[0])
    const list: Candidate[] = places.map((p, i) => ({
      ...p,
      key: Date.now() + i,
      checked: true,
      category: guessSpotCategory(p.name),
      status: p.lat != null ? 'coords' : 'waiting',
    }))
    setCands(list)
    if (!list.length) return toast('找不到地名，試試一行一個地點的格式')
    setBusy(true)
    // 依序查座標（OpenStreetMap 規定每秒最多一次）
    for (const c of list) {
      if (c.lat != null || !c.queries.length) {
        if (c.lat == null) update(c.key, { status: 'notfound' })
        continue
      }
      update(c.key, { status: 'locating' })
      try {
        const r = await api<{ lat?: number; lng?: number; source?: string; confidence?: Candidate['confidence']; notFound?: boolean; guesses?: Guess[] }>(`/t/${state.trip.id}/locate`, {
          token,
          body: { queries: c.queries, near },
        })
        if (r.guesses?.length) update(c.key, { status: 'guess', guesses: r.guesses })
        else update(c.key, r.notFound ? { status: 'notfound' } : { status: 'found', lat: r.lat, lng: r.lng, confidence: r.confidence, source: r.source })
      } catch {
        update(c.key, { status: 'notfound' })
      }
      await new Promise((r) => setTimeout(r, 1100))
    }
    setBusy(false)
  }

  async function findReel(url: string) {
    setReel(undefined)
    setReelErr('')
    setBusy(true)
    try {
      const r = await api<ReelResult>(`/t/${state.trip.id}/reel`, { token, body: { url } })
      setReel({ ...r, url })
    } catch (e) {
      setReelErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  function useReel() {
    if (!reel) return
    const caption = reel.caption ?? reel.places.map((p) => (p.area ? `${p.area}｜${p.name}` : p.name)).join('\n')
    setText(caption)
    setSource(reel.url)
    setMode('text')
    // Gemini 已經挑出地點就直接用，否則用規則解析說明文字
    const preset: ExtractedPlace[] = reel.places.map((p) => ({ name: p.name, area: p.area, queries: areaQueries(p.name, p.area) }))
    analyze(caption, preset)
  }

  async function pasteFromClipboard() {
    try {
      const t = await navigator.clipboard.readText()
      if (!t.trim()) return toast('剪貼簿是空的')
      setText(t)
      analyze(t)
    } catch {
      toast('沒辦法讀剪貼簿，請直接在框框裡長按貼上')
    }
  }

  async function addChecked() {
    const chosen = cands.filter((c) => c.checked && c.name.trim())
    if (!chosen.length) return
    onClose()
    for (const [i, c] of chosen.entries()) {
      const data: SpotData = { title: c.name.trim(), category: c.category, lat: c.lat, lng: c.lng, address: c.area, source: source.trim() || undefined }
      const last = i === chosen.length - 1
      await save('spot', data, { activity: last ? `把 ${chosen.length} 個地點加進口袋名單 ⭐${chosen.length <= 3 ? `：${chosen.map((x) => x.name).join('、')}` : ''}` : undefined })
    }
  }

  return (
    <Sheet title="＋ 加到口袋名單" onClose={onClose}>
      <div className="stack">
        <div className="seg">
          <button aria-pressed={mode === 'text'} onClick={() => setMode('text')}>📝 貼上文字</button>
          <button aria-pressed={mode === 'link'} onClick={() => setMode('link')}>🔗 貼文連結</button>
          <button aria-pressed={mode === 'single'} onClick={() => setMode('single')}>📍 單一地點</button>
        </div>

        {mode === 'single' && <SingleSpotForm onDone={onClose} />}

        {mode === 'link' && <ReelPanel reel={reel} error={reelErr} busy={busy} onFind={findReel} onUse={useReel} onFallback={() => setMode('text')} />}

        {mode === 'text' && (
          <>
            <textarea
              className="input"
              style={{ minHeight: 110 }}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={'貼上截圖辨識出的文字、貼文說明…\n例如：\n1・富士山駅\n2・新倉富士浅間神社\n北35.51261° 東138.76903°'}
            />
            <div className="row">
              <button className="btn white sm grow" onClick={pasteFromClipboard}>📋 從剪貼簿貼上</button>
              <button className="btn sm grow" disabled={!text.trim() || busy} onClick={() => analyze()}>{busy ? '分析中…' : '🔎 分析'}</button>
            </div>
            <details className="small">
              <summary>怎麼從截圖拿到文字？</summary>
              <div className="stack" style={{ gap: 4, marginTop: 6 }}>
                <span><b>不用裝任何東西：</b>在「照片」打開截圖 → 長按文字 →「全選」→「拷貝」→ 回來按「從剪貼簿貼上」。</span>
                <span><b>用捷徑更快：</b>捷徑 App 新增捷徑：「從共享表單接收<u>影像</u>」→「從影像中擷取文字」→「拷貝到剪貼簿」→「顯示通知」，名稱取「加到旅遊手帖」。之後截圖 → 分享 → 選這個捷徑，再回來按「從剪貼簿貼上」。</span>
              </div>
            </details>

            {cands.length > 0 && (
              <>
                <Field label="來源連結（Reels、部落格…，可不填）">
                  <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="https://" inputMode="url" />
                </Field>
                <div className="list">
                  {cands.map((c) => <CandidateRow key={c.key} c={c} near={near} onChange={(p) => update(c.key, p)} />)}
                </div>
                <button className="btn coral block" disabled={busy || !cands.some((c) => c.checked)} onClick={addChecked}>
                  {busy ? '還在找座標…' : `加入勾選的 ${cands.filter((c) => c.checked).length} 個`}
                </button>
              </>
            )}
          </>
        )}
      </div>
    </Sheet>
  )
}

const SOCIAL = /^https?:\/\/([\w-]+\.)*(instagram\.com|tiktok\.com|youtube\.com|youtu\.be|xiaohongshu\.com|xhslink\.com|threads\.net|facebook\.com)\//i

interface ReelResult {
  found: boolean
  caption: string | null
  places: { name: string; area?: string }[]
  verified: boolean
}

function ReelPanel({ reel, error, busy, onFind, onUse, onFallback }: { reel?: ReelResult & { url: string }; error: string; busy: boolean; onFind: (url: string) => void; onUse: () => void; onFallback: () => void }) {
  const [url, setUrl] = useState(reel?.url ?? '')
  return (
    <div className="stack">
      <p className="small muted">貼上 Instagram Reels、TikTok、YouTube Shorts、小紅書的連結。Gemini 會用 Google 搜尋找出這篇貼文的文字與地點（不會直接存取這些平台）。</p>
      <div className="row">
        <input className="input grow" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.instagram.com/reel/…" inputMode="url" />
        <button className="btn sm" disabled={busy || !SOCIAL.test(url.trim())} onClick={() => onFind(url.trim())}>{busy ? '找…' : '🤖 找文字'}</button>
      </div>
      {busy && <div className="small">🔎 Gemini 搜尋中，大約要 10–30 秒…</div>}
      {error && !busy && (
        <div className="card flat coral stack" style={{ padding: 12, gap: 8 }}>
          <div className="small" style={{ whiteSpace: 'pre-wrap' }}>😢 {error}</div>
          <button className="btn white block" onClick={onFallback}>改用截圖文字</button>
        </div>
      )}
      {reel && !busy && (reel.found ? (
        <div className="card flat stack" style={{ padding: 12, gap: 8 }}>
          <div className="small">
            {reel.verified ? '✅ 在 Google 搜尋結果裡找到這篇貼文' : '⚠️ 搜尋來源無法確認是這篇貼文，Gemini 可能找錯或自己補寫，請核對下面的文字'}
          </div>
          {reel.caption && <div className="small" style={{ whiteSpace: 'pre-wrap', maxHeight: 180, overflow: 'auto', background: 'var(--paper)', padding: 8, borderRadius: 10 }}>{reel.caption}</div>}
          <div className="small">找到 {reel.places.length} 個地點{reel.places.length > 0 && `：${reel.places.slice(0, 5).map((p) => p.name).join('、')}${reel.places.length > 5 ? '…' : ''}`}</div>
          <button className="btn coral block" onClick={onUse}>用這些找座標 →</button>
        </div>
      ) : (
        <div className="card flat coral stack" style={{ padding: 12, gap: 8 }}>
          <div className="small">😢 Google 上找不到這篇貼文的文字。可能是剛發布還沒被收錄，或地點清單在留言裡。</div>
          <button className="btn white block" onClick={onFallback}>改用截圖文字</button>
        </div>
      ))}
    </div>
  )
}

const STATUS_TEXT: Record<Candidate['status'], string> = {
  coords: '📍 文字裡有座標',
  waiting: '⏳ 等待中',
  locating: '🔎 找座標中…',
  found: '📍 已找到',
  notfound: '❓ 找不到座標，可以按「修正」貼 Google Maps 連結',
  manual: '📍 已用你貼的連結',
  picked: '📍 已選用推測的位置',
  guess: '⚠️ 找不到確定的位置，下面是推測的結果，請按「看」確認後再選',
}

const SOURCE_NAME: Record<string, string> = { google: 'Google', osm: 'OpenStreetMap' }

function CandidateRow({ c, near, onChange }: { c: Candidate; near?: { lat: number; lng: number }; onChange: (p: Partial<Candidate>) => void }) {
  const { state, token, toast } = useTrip()
  const [fixing, setFixing] = useState(false)
  const [link, setLink] = useState('')
  const status = c.status === 'found' && c.confidence === 'high' ? '📍 已找到（兩個來源一致）' : STATUS_TEXT[c.status]

  async function applyLink() {
    try {
      const r = await api<{ name?: string; lat?: number; lng?: number }>(`/t/${state.trip.id}/resolve-url`, { token, body: { url: link.trim() } })
      if (r.lat == null) return toast('這個連結沒有座標，請貼 Google Maps 的分享連結')
      onChange({ lat: r.lat, lng: r.lng, status: 'manual', confidence: undefined })
      setFixing(false)
      setLink('')
    } catch (e) {
      toast((e as Error).message)
    }
  }

  return (
    <div className="todo" style={{ flexWrap: 'wrap', opacity: c.checked ? 1 : 0.5 }}>
      <button className="box" role="checkbox" aria-checked={c.checked} onClick={() => onChange({ checked: !c.checked })}>{c.checked ? '✓' : ''}</button>
      <input className="input grow" style={{ minHeight: 38, padding: '4px 10px' }} value={c.name} onChange={(e) => onChange({ name: e.target.value })} />
      <div className="seg" style={{ width: '100%' }}>
        {SPOT_CATS.map((k) => (
          <button key={k.id} type="button" aria-pressed={c.category === k.id} onClick={() => onChange({ category: k.id })} style={{ padding: '2px 8px' }}>{k.icon}</button>
        ))}
      </div>
      {c.area && <div className="small muted" style={{ width: '100%' }}>地區：{c.area}</div>}
      <div className="small" style={{ width: '100%' }}>{status}</div>
      {c.status === 'guess' &&
        c.guesses?.map((g) => (
          <div key={g.source} className="row small" style={{ width: '100%', gap: 6 }}>
            <span className="grow">{SOURCE_NAME[g.source] ?? g.source} 的推測</span>
            <a className="btn white sm" href={`https://www.google.com/maps/search/?api=1&query=${g.lat},${g.lng}`} target="_blank" rel="noreferrer">看</a>
            <button className="btn sm" onClick={() => onChange({ lat: g.lat, lng: g.lng, status: 'picked', guesses: undefined })}>用這個</button>
          </div>
        ))}
      <div className="row wrap" style={{ gap: 6, width: '100%' }}>
        <a className="btn white sm" href={c.lat != null ? `https://www.google.com/maps/search/?api=1&query=${c.lat},${c.lng}` : googleSearch(c.queries[0] ?? c.name, near)} target="_blank" rel="noreferrer">🔍 在 Google Maps 查看</a>
        <button className="btn white sm" onClick={() => setFixing(!fixing)}>🔧 修正</button>
      </div>
      {fixing && (
        <div className="row" style={{ width: '100%' }}>
          <input className="input grow" style={{ minHeight: 38 }} value={link} onChange={(e) => setLink(e.target.value)} placeholder="貼上 Google Maps 分享連結" inputMode="url" />
          <button className="btn sm" onClick={applyLink}>套用</button>
        </div>
      )}
    </div>
  )
}

function SingleSpotForm({ onDone }: { onDone: () => void }) {
  const { save } = useTrip()
  const [d, setD] = useState<SpotData>({ title: '', category: 'other' })
  return (
    <form
      className="stack"
      onSubmit={async (e) => {
        e.preventDefault()
        if (!d.title.trim()) return
        onDone()
        await save('spot', { ...d, title: d.title.trim() }, { activity: `把「${d.title.trim()}」加進口袋名單 ⭐` })
      }}
    >
      <PlaceInput value={d} onPick={(p) => setD((x) => ({ ...x, title: x.title || p.name || '', category: x.title ? x.category : guessSpotCategory(p.name ?? ''), address: x.address || p.address, lat: p.lat, lng: p.lng, url: p.url ?? x.url }))} />
      <SpotFields d={d} setD={setD} />
      <button className="btn coral block">加入口袋名單</button>
    </form>
  )
}

function SpotFields({ d, setD }: { d: SpotData; setD: (f: (x: SpotData) => SpotData) => void }) {
  return (
    <>
      <Field label="名稱"><input required maxLength={80} value={d.title} onChange={(e) => setD((x) => ({ ...x, title: e.target.value }))} /></Field>
      <div className="seg">
        {SPOT_CATS.map((k) => <button key={k.id} type="button" aria-pressed={d.category === k.id} onClick={() => setD((x) => ({ ...x, category: k.id }))}>{k.icon} {k.label}</button>)}
      </div>
      <Field label="來源連結（Reels、部落格…）"><input type="url" value={d.source ?? ''} onChange={(e) => setD((x) => ({ ...x, source: e.target.value || undefined }))} placeholder="https://" /></Field>
      <Field label="備註"><textarea value={d.note ?? ''} onChange={(e) => setD((x) => ({ ...x, note: e.target.value || undefined }))} placeholder="招牌是…、要排隊…" /></Field>
    </>
  )
}

function SpotEditor({ spot, onClose }: { spot: Entity<'spot'>; onClose: () => void }) {
  const { save, remove } = useTrip()
  const [d, setD] = useState<SpotData>(spot.data)
  return (
    <Sheet title="編輯口袋地點" onClose={onClose}>
      <form
        className="stack"
        onSubmit={async (e) => {
          e.preventDefault()
          onClose()
          await save('spot', d, { id: spot.id, activity: `修改了口袋地點「${d.title}」` })
        }}
      >
        <PlaceInput value={d} onPick={(p) => setD((x) => ({ ...x, address: x.address || p.address, lat: p.lat, lng: p.lng, url: p.url ?? x.url }))} />
        <SpotFields d={d} setD={setD} />
        <button className="btn coral block">儲存</button>
        <button type="button" className="btn ghost block" onClick={() => { onClose(); remove(spot.id, `把「${d.title}」移出口袋名單`) }}>🗑 刪除（7 天內可還原）</button>
      </form>
    </Sheet>
  )
}

function ScheduleSheet({ spot, onClose }: { spot: Entity<'spot'>; onClose: () => void }) {
  const { state, me, save } = useTrip()
  const dates = useDates()
  const [date, setDate] = useState(dates[0])
  const [time, setTime] = useState('')
  const [transport, setTransport] = useState<ItemData['transport']>('train')
  const [participants, setParticipants] = useState<Participants>('all')
  const d = spot.data
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    onClose()
    const item: ItemData = { date, time, title: d.title, transport, participants, lat: d.lat, lng: d.lng, placeName: d.title, url: d.url ?? d.source, note: d.note }
    const id = await save('item', item, { activity: `把口袋地點「${d.title}」排進 ${fmtDate(date, false)} 📅` })
    if (id) await save('spot', { ...d, scheduledItemId: id }, { id: spot.id })
  }
  return (
    <Sheet title={`📅 排進行程：${d.title}`} onClose={onClose}>
      <form className="stack" onSubmit={submit}>
        <div className="grid2">
          <Field label="日期">
            <select value={date} onChange={(e) => setDate(e.target.value)}>
              {dates.map((x) => <option key={x} value={x}>{fmtDate(x)}</option>)}
            </select>
          </Field>
          <Field label="時間（可不填）"><input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
        </div>
        <span className="small">怎麼過去？</span>
        <div className="seg">
          {TRANSPORTS.map((t) => <button key={t.id} type="button" aria-pressed={transport === t.id} onClick={() => setTransport(t.id)}>{t.icon} {t.label}</button>)}
        </div>
        <span className="small">誰要去？</span>
        <ParticipantsPicker value={participants} onChange={setParticipants} members={state.members} me={me.id} />
        <button className="btn coral block">排進去</button>
      </form>
    </Sheet>
  )
}
