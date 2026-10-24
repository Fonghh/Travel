import { useEffect, useMemo, useRef, useState } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import L from 'leaflet'
import type { Entity } from '../../shared/types.ts'
import { AnimalFace } from '../art/animals.tsx'
import { colorHex, transportInfo } from '../data.ts'
import { useTrip } from '../lib/store.tsx'
import { fmtDate } from '../lib/time.ts'
import { prefersReduced } from '../lib/motion.ts'
import { Avatar } from '../components/ui.tsx'
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
  const checkins = list('checkin')
  const visitedBy = (itemId: string, memberId: string) => checkins.some((c) => c.data.itemId === itemId && c.data.memberId === memberId)
  const routeMembers = state.members.filter((m) => (filter === 'all' ? true : m.id === (filter === 'me' ? me.id : filter)))

  useEffect(() => {
    if (!box.current || mapRef.current) return
    const map = L.map(box.current, { zoomControl: false, attributionControl: true }).setView([36.2, 138.2], 5)
    L.control.zoom({ position: 'bottomright' }).addTo(map)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
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
      <p className="small muted">實線＝打卡去過、虛線＝計畫中。{noCoords > 0 && `有 ${noCoords} 個行程沒有座標，編輯時用「貼網址」或「搜尋地點」補上就會出現在地圖上。`}</p>
    </>
  )
}
