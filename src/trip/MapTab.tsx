import { useEffect, useMemo, useRef, useState } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import L from 'leaflet'
import type { Entity } from '../../shared/types.ts'
import { AnimalFace } from '../art/animals.tsx'
import { colorHex, spotCat, transportInfo } from '../data.ts'
import { useTrip } from '../lib/store.tsx'
import { fmtDate } from '../lib/time.ts'
import { prefersReduced } from '../lib/motion.ts'
import { Avatar, Sheet } from '../components/ui.tsx'
import { buildKml } from '../lib/kml.ts'
import type { KmlFolder, KmlPlace } from '../lib/kml.ts'
import { mapsLink, sortItems } from './helpers.ts'
import { matchFilter, MemberFilterBar, useDates } from './PlanTab.tsx'
import type { MemberFilter } from './PlanTab.tsx'

const INK = '#3E3A39'

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

export default function MapTab() {
  const { state, list, me, member } = useTrip()
  const dates = useDates()
  const [date, setDate] = useState('all')
  const [filter, setFilter] = useState<MemberFilter>('all')
  const [exportOpen, setExportOpen] = useState(false)
  const [showSpots, setShowSpots] = useState(true)
  const box = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layerRef = useRef<L.LayerGroup | null>(null)
  const fittedKey = useRef('')

  const items = useMemo(
    () =>
      list('item')
        .filter((i) => i.data.lat != null && i.data.lng != null)
        .filter((i) => date === 'all' || i.data.date === date)
        .filter((i) => matchFilter(i.data.participants, filter, me.id))
        .sort(sortItems),
    [list, date, filter, me.id],
  )
  const stays = list('stay').filter((s) => s.data.lat != null && matchFilter(s.data.participants, filter, me.id))
  const spots = showSpots ? unscheduledSpots(list('spot'), list('item')) : []
  const voteCount = (id: string) => list('vote').filter((v) => v.data.spotId === id).length
  const checkins = list('checkin')
  const visitedBy = (itemId: string, memberId: string) => checkins.some((c) => c.data.itemId === itemId && c.data.memberId === memberId)
  const routeMembers = state.members.filter((m) => (filter === 'all' ? true : m.id === (filter === 'me' ? me.id : filter)))

  useEffect(() => {
    if (!box.current || mapRef.current) return
    const map = L.map(box.current, { zoomControl: false, attributionControl: true }).setView([36.2, 138.2], 5)
    L.control.zoom({ position: 'bottomright' }).addTo(map)
    // OpenStreetMap 官方圖磚：免金鑰，需標示出處
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map)
    layerRef.current = L.layerGroup().addTo(map)
    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const layer = layerRef.current
    if (!map || !layer) return
    layer.clearLayers()
    const bounds: L.LatLngExpression[] = []

    // 路線：每個人依時間連線，去過的段落用實線
    routeMembers.forEach((m, mi) => {
      const mine = items.filter((i) => i.data.participants === 'all' || i.data.participants.includes(m.id))
      if (mine.length < 2) return
      const angle = (mi / Math.max(1, routeMembers.length)) * Math.PI * 2
      const off = routeMembers.length > 1 ? 0.00025 : 0
      const pt = (i: Entity<'item'>): L.LatLngTuple => [i.data.lat! + Math.sin(angle) * off, i.data.lng! + Math.cos(angle) * off]
      for (let k = 0; k < mine.length - 1; k++) {
        const a = mine[k], b = mine[k + 1]
        const done = visitedBy(a.id, m.id) && visitedBy(b.id, m.id)
        const seg = [pt(a), pt(b)]
        L.polyline(seg, { color: INK, weight: 7, opacity: 0.9, dashArray: done ? undefined : '2 12', lineCap: 'round' }).addTo(layer)
        L.polyline(seg, { color: colorHex(m.color), weight: 4, opacity: 1, dashArray: done ? undefined : '2 12', lineCap: 'round' }).addTo(layer)
        if (routeMembers.length === 1 && b.data.transport !== 'none') {
          const mid: L.LatLngTuple = [(seg[0][0] + seg[1][0]) / 2, (seg[0][1] + seg[1][1]) / 2]
          L.marker(mid, { icon: L.divIcon({ className: 'map-hop', html: transportInfo(b.data.transport).icon, iconSize: [26, 26] }), interactive: false }).addTo(layer)
        }
      }
    })

    // 行程點
    for (const it of items) {
      const p = it.data.participants
      const visited = checkins.some((c) => c.data.itemId === it.id)
      const first = p === 'all' ? undefined : member(p[0])
      const inner =
        p === 'all'
          ? `<span style="font-size:20px">${it.data.meetup ? '🚩' : it.data.mustGo ? '⭐' : '🎌'}</span>`
          : first
            ? renderToStaticMarkup(<AnimalFace id={first.animal} size={30} />)
            : '📍'
      const bg = p === 'all' ? '#F6D27A' : first ? colorHex(first.color) : '#fff'
      const icon = L.divIcon({
        className: '',
        html: `<div class="map-pin${visited ? '' : ' hollow'}" style="width:40px;height:40px;background:${bg}">${inner}</div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      })
      const who = p === 'all' ? '全員' : p.map((id) => member(id)?.name).filter(Boolean).join('、')
      const link = mapsLink(it.data)
      L.marker([it.data.lat!, it.data.lng!], { icon })
        .bindPopup(
          `<b>${esc(it.data.title)}</b><br>${fmtDate(it.data.date)} ${esc(it.data.time || '')}<br>👥 ${esc(who)}${visited ? '<br>✔ 有人打卡' : ''}${
            link ? `<br><a href="${esc(link)}" target="_blank" rel="noreferrer">在 Google Maps 開啟</a>` : ''
          }`,
        )
        .addTo(layer)
      bounds.push([it.data.lat!, it.data.lng!])
    }
    for (const sp of spots) {
      const c = spotCat(sp.data.category)
      const icon = L.divIcon({ className: '', html: `<div class="map-pin hollow" style="width:34px;height:34px;background:#FDF3D6;font-size:17px">${c.icon}</div>`, iconSize: [34, 34], iconAnchor: [17, 17] })
      const n = voteCount(sp.id)
      const link = mapsLink({ ...sp.data, name: sp.data.title })
      L.marker([sp.data.lat!, sp.data.lng!], { icon })
        .bindPopup(`<b>⭐ ${esc(sp.data.title)}</b><br>口袋名單・${c.label}${n ? `・🙋 ${n} 人想去` : ''}${link ? `<br><a href="${esc(link)}" target="_blank" rel="noreferrer">在 Google Maps 開啟</a>` : ''}`)
        .addTo(layer)
      bounds.push([sp.data.lat!, sp.data.lng!])
    }
    for (const s of stays) {
      const icon = L.divIcon({ className: '', html: `<div class="map-pin" style="width:36px;height:36px;background:#A8D3E6;font-size:18px">🏨</div>`, iconSize: [36, 36], iconAnchor: [18, 18] })
      L.marker([s.data.lat!, s.data.lng!], { icon }).bindPopup(`<b>${esc(s.data.name)}</b><br>${fmtDate(s.data.checkIn)} – ${fmtDate(s.data.checkOut)}`).addTo(layer)
      bounds.push([s.data.lat!, s.data.lng!])
    }

    const key = `${date}|${filter}|${bounds.length}`
    if (bounds.length && fittedKey.current !== key) {
      fittedKey.current = key
      map.invalidateSize()
      map.fitBounds(L.latLngBounds(bounds), { padding: [40, 40], maxZoom: 15, animate: !prefersReduced() })
    }
  })

  const noCoords = list('item').filter((i) => i.data.lat == null).length
  return (
    <>
      <div className="row between wrap">
        <select className="input" style={{ width: 'auto', minHeight: 36, padding: '2px 10px', borderWidth: 2.5 }} value={date} onChange={(e) => setDate(e.target.value)} aria-label="日期">
          <option value="all">全部日期</option>
          {dates.map((d) => <option key={d} value={d}>{fmtDate(d)}</option>)}
        </select>
        <MemberFilterBar value={filter} onChange={setFilter} />
      </div>
      <div ref={box} className="map" />
      <div className="row wrap" style={{ gap: 6 }}>
        {routeMembers.map((m) => (
          <button key={m.id} className="checkin" style={{ background: colorHex(m.color), cursor: 'pointer' }} onClick={() => setFilter(m.id === me.id ? 'me' : m.id)}>
            <Avatar m={m} size={22} /> {m.name}
          </button>
        ))}
      </div>
      <label className="check small"><input type="checkbox" checked={showSpots} onChange={(e) => setShowSpots(e.target.checked)} /> 顯示口袋名單（⭐ 還沒排進行程的地點）</label>
      <button className="btn white block" onClick={() => setExportOpen(true)}>📤 匯出到 Google 我的地圖</button>
      {exportOpen && <ExportSheet date={date} filter={filter} onClose={() => setExportOpen(false)} />}
      <p className="small muted">實線＝打卡去過、虛線＝計畫中。{noCoords > 0 && `有 ${noCoords} 個行程沒有座標，編輯時用「貼網址」或「搜尋地點」補上就會出現在地圖上。`}</p>
    </>
  )
}

function ExportSheet({ date, filter, onClose }: { date: string; filter: MemberFilter; onClose: () => void }) {
  const { state, list, me, member, toast } = useTrip()
  const [withStays, setWithStays] = useState(true)
  const [withSpots, setWithSpots] = useState(true)
  const spots = unscheduledSpots(list('spot'), list('item'))
  const who = filter === 'all' ? undefined : filter === 'me' ? me : member(filter)
  const checkins = list('checkin')
  const items = list('item')
    .filter((i) => i.data.lat != null && i.data.lng != null)
    .filter((i) => date === 'all' || i.data.date === date)
    .filter((i) => matchFilter(i.data.participants, filter, me.id))
    .sort(sortItems)
  const stays = list('stay').filter((s) => s.data.lat != null && s.data.lng != null && matchFilter(s.data.participants, filter, me.id))

  function build() {
    const byDate = new Map<string, KmlPlace[]>()
    for (const it of items) {
      const d = it.data
      const p = d.participants
      const people = p === 'all' ? '全員' : p.map((id) => member(id)?.name).filter(Boolean).join('、')
      const desc = [
        `${fmtDate(d.date)} ${d.time}${d.endTime ? `–${d.endTime}` : ''}`.trim(),
        `👥 ${people}`,
        d.transport !== 'none' ? `${transportInfo(d.transport).icon} ${transportInfo(d.transport).label}` : '',
        d.mustGo ? '⭐ 必去' : '',
        d.note ?? '',
        d.url ?? '',
      ].filter(Boolean).join('\n')
      const visited = checkins.some((c) => c.data.itemId === it.id)
      const place: KmlPlace = {
        name: `${d.time ? d.time + ' ' : ''}${d.title}`,
        lat: d.lat!,
        lng: d.lng!,
        description: desc,
        style: visited ? 'visited' : d.meetup ? 'meetup' : d.mustGo ? 'must' : 'normal',
      }
      byDate.set(d.date, [...(byDate.get(d.date) ?? []), place])
    }
    const folders: KmlFolder[] = [...byDate.entries()].map(([d, places]) => ({
      name: fmtDate(d),
      places,
      route: who ? { name: `${who.name}的路線 ${fmtDate(d, false)}`, color: colorHex(who.color) } : undefined,
    }))
    if (withStays && stays.length) {
      folders.push({
        name: '🏨 住宿',
        places: stays.map((s) => ({
          name: s.data.name,
          lat: s.data.lat!,
          lng: s.data.lng!,
          description: [`${fmtDate(s.data.checkIn)} – ${fmtDate(s.data.checkOut)}`, s.data.address ?? '', s.data.bookingRef ? `訂房代號 ${s.data.bookingRef}` : ''].filter(Boolean).join('\n'),
          style: 'stay' as const,
        })),
      })
    }
    if (withSpots && spots.length) {
      folders.push({
        name: '⭐ 口袋名單',
        places: spots.map((sp) => {
          const n = list('vote').filter((v) => v.data.spotId === sp.id).length
          return {
            name: sp.data.title,
            lat: sp.data.lat!,
            lng: sp.data.lng!,
            description: [`${spotCat(sp.data.category).icon} ${spotCat(sp.data.category).label}`, n ? `🙋 ${n} 人想去` : '', sp.data.note ?? '', sp.data.source ?? ''].filter(Boolean).join('\n'),
            style: 'spot' as const,
          }
        }),
      })
    }
    const title = [state.trip.name, who?.name, date === 'all' ? '' : fmtDate(date, false)].filter(Boolean).join(' ')
    return { kml: buildKml(title, folders), title }
  }

  async function download() {
    const { kml, title } = build()
    // 檔名用英數字（部分瀏覽器遇到中文檔名會改成 download）；匯入後顯示的是 KML 內的中文名稱
    const filename = ['travel', state.trip.id, who?.id, date === 'all' ? '' : date].filter(Boolean).join('-') + '.kml'
    const file = new File([kml], filename, { type: 'application/vnd.google-earth.kml+xml' })
    // iPhone：用分享選單，可以存到「檔案」、AirDrop 或寄給自己
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title })
        return
      } catch (e) {
        if ((e as Error).name === 'AbortError') return
      }
    }
    const url = URL.createObjectURL(file)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 5000)
    toast('已下載 KML 檔')
  }

  const count = items.length + (withStays ? stays.length : 0) + (withSpots ? spots.length : 0)
  return (
    <Sheet title="📤 匯出到 Google 我的地圖" onClose={onClose}>
      <div className="stack">
        <div className="card flat paper small" style={{ padding: 12 }}>
          範圍：{date === 'all' ? '全部日期' : fmtDate(date)}・{who ? `${who.name}的行程（含路線）` : '所有人的行程'}
          <br />
          共 {count} 個地點（沒有座標的行程不會匯出）
        </div>
        <label className="check"><input type="checkbox" checked={withStays} onChange={(e) => setWithStays(e.target.checked)} /> 包含住宿</label>
        <label className="check"><input type="checkbox" checked={withSpots} onChange={(e) => setWithSpots(e.target.checked)} /> 包含口袋名單（{spots.length} 個）</label>
        <button className="btn coral block" onClick={download} disabled={!count}>下載 KML 檔</button>
        <div className="stack small" style={{ gap: 6 }}>
          <b>匯入 Google 我的地圖</b>
          <span>1. 把 KML 檔存到「檔案」或寄給自己，用<b>電腦</b>打開 mymaps.google.com（手機網頁版不能匯入）</span>
          <span>2. 「建立新地圖」→ 左邊圖層下的「匯入」→ 選這個 KML 檔</span>
          <span>3. 手機打開 Google Maps →「已儲存」→ 最下方「地圖」，就看得到了，也能直接導航</span>
          <span className="muted">行程有更新時，重新匯出，再刪掉舊圖層、匯入新的即可。地圖上方的篩選（日期、看某人）會決定匯出的範圍。</span>
        </div>
      </div>
    </Sheet>
  )
}

/** 有座標、還沒排進行程的口袋地點 */
function unscheduledSpots(spots: Entity<'spot'>[], items: Entity<'item'>[]) {
  const itemIds = new Set(items.map((i) => i.id))
  return spots.filter((s) => s.data.lat != null && s.data.lng != null && !(s.data.scheduledItemId && itemIds.has(s.data.scheduledItemId)))
}
