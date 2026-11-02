// 產生在 Google Maps 開啟的路線連結（官方 Maps URLs，不需金鑰）

export interface RoutePoint {
  lat: number
  lng: number
}

/** 每段最多幾個中途點：Google 官方說最多 9 個（手機瀏覽器可能更少） */
export const MAX_WAYPOINTS = 9

const ll = (p: RoutePoint) => `${p.lat},${p.lng}`

/**
 * 依序串起各點，點太多時切成多段（每段的終點是下一段的起點）。
 * fromCurrent：不指定起點，Google Maps 會從使用者目前位置出發。
 */
export function routeLinks(points: RoutePoint[], opts: { fromCurrent?: boolean; travelmode?: string } = {}): string[] {
  if (!points.length) return []
  if (points.length === 1) opts = { ...opts, fromCurrent: true } // 只有一個點：從目前位置導航過去
  const links: string[] = []
  // fromCurrent 時第一段沒有起點，所以能多放一個點
  let i = 0
  let first = true
  while (i < points.length) {
    const noOrigin = first && opts.fromCurrent
    const start = noOrigin ? undefined : points[i]
    const from = noOrigin ? i : i + 1
    const end = Math.min(points.length - 1, from + MAX_WAYPOINTS)
    if (!noOrigin && end < from) break // 只剩一個點且已是上一段終點
    const dest = points[end]
    const mids = points.slice(from, end)
    const q = new URLSearchParams({ api: '1', destination: ll(dest) })
    if (start) q.set('origin', ll(start))
    if (mids.length) q.set('waypoints', mids.map(ll).join('|'))
    if (opts.travelmode) q.set('travelmode', opts.travelmode)
    links.push(`https://www.google.com/maps/dir/?${q.toString().replace(/%2C/g, ',').replace(/%7C/g, '|')}`)
    if (end >= points.length - 1) break
    i = end
    first = false
  }
  return links
}
