import type { Entity, ItemData, TripState } from '../../shared/types.ts'
import { RECOMMEND, themeInfo } from '../data.ts'
import { zonedToUtc } from '../lib/time.ts'

const inP = (p: ItemData['participants'], id: string) => p === 'all' || p.includes(id)

/** 自己的出發時間：自己最早的航班；沒有航班就用旅行第一天 */
export function myDeparture(s: TripState): { at: number; label: string } {
  const flights = s.entities
    .filter((e): e is Entity<'flight'> => e.kind === 'flight' && !e.deletedAt)
    .filter((e) => inP(e.data.participants, s.me) && e.data.depLocal)
    .map((e) => ({ at: zonedToUtc(e.data.depLocal, e.data.depTz), label: `${e.data.flightNo || '航班'} 起飛` }))
    .sort((a, b) => a.at - b.at)
  if (flights[0]) return flights[0]
  const [y, m, d] = s.trip.startDate.split('-').map(Number)
  return { at: new Date(y, m - 1, d).getTime(), label: '出發日' }
}

export function countdownParts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60) }
}

export function sortItems(a: Entity<'item'>, b: Entity<'item'>) {
  return a.data.date.localeCompare(b.data.date) || (a.data.time || '99').localeCompare(b.data.time || '99') || a.createdAt - b.createdAt
}

export function mapsLink(d: { lat?: number; lng?: number; placeName?: string; title?: string; name?: string; url?: string }) {
  if (d.url && /google\.[a-z.]+\/maps|maps\.app\.goo\.gl/.test(d.url)) return d.url
  if (d.lat != null && d.lng != null) return `https://www.google.com/maps/search/?api=1&query=${d.lat},${d.lng}`
  const q = d.placeName || d.name || d.title
  return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : undefined
}

/** 吃喝玩樂：開 Google Maps 搜尋附近 */
export function nearbyLink(theme: string, sub: (typeof RECOMMEND)[number]['subs'][number], at: { lat?: number; lng?: number; placeName?: string; title?: string }) {
  const q = sub.q[themeInfo(theme).search]
  if (at.lat != null && at.lng != null) return `https://www.google.com/maps/search/${encodeURIComponent(q)}/@${at.lat},${at.lng},16z`
  // 沒座標時用「near」，否則 Google 會直接搜到該地點本身
  const place = at.placeName || at.title || ''
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place ? `${q} near ${place}` : q)}`
}
