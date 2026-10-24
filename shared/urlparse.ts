// 從 Google Maps 網址解析出地點名稱與座標（不需 API 金鑰）

export interface ParsedPlace {
  name?: string
  address?: string
  lat?: number
  lng?: number
}

const SHORT_HOSTS = ['maps.app.goo.gl', 'goo.gl', 'g.co']

export function isShortMapsUrl(u: URL): boolean {
  return SHORT_HOSTS.includes(u.hostname) && (u.hostname !== 'goo.gl' || u.pathname.startsWith('/maps'))
}

export function isGoogleMapsUrl(u: URL): boolean {
  const h = u.hostname.replace(/^www\./, '')
  if (h === 'maps.google.com' || /^maps\.google\.[a-z.]+$/.test(h)) return true
  return /^google\.[a-z.]+$/.test(h) && u.pathname.startsWith('/maps')
}

function decodePart(s: string): string {
  try {
    return decodeURIComponent(s.replace(/\+/g, ' ')).trim()
  } catch {
    return s.replace(/\+/g, ' ').trim()
  }
}

function validCoord(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
}

const COORD_TEXT = /^\s*(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/

export function parseGoogleMapsUrl(raw: string): ParsedPlace | null {
  let u: URL
  try {
    u = new URL(raw)
  } catch {
    return null
  }
  if (!isGoogleMapsUrl(u)) return null
  const out: ParsedPlace = {}
  const full = decodePart(u.pathname)

  // 地點本身的座標：data=...!3d35.66!4d139.77（比 @ 後面的畫面中心準）
  const d = /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/.exec(u.pathname + u.search)
  if (d) {
    const lat = parseFloat(d[1]), lng = parseFloat(d[2])
    if (validCoord(lat, lng)) Object.assign(out, { lat, lng })
  }

  // /maps/place/<名稱>/  或 /maps/search/<名稱>/
  const m = /\/maps\/(?:place|search)\/([^/]+)/.exec(u.pathname)
  if (m) {
    const name = decodePart(m[1])
    const c = COORD_TEXT.exec(name)
    if (c) {
      if (out.lat == null) Object.assign(out, { lat: parseFloat(c[1]), lng: parseFloat(c[2]) })
    } else if (name && !name.startsWith('@')) {
      out.name = name
    }
  }

  // ?q= / ?query= / ?destination=
  for (const key of ['q', 'query', 'destination', 'daddr']) {
    const v = u.searchParams.get(key)
    if (!v) continue
    const c = COORD_TEXT.exec(v)
    if (c) {
      if (out.lat == null) Object.assign(out, { lat: parseFloat(c[1]), lng: parseFloat(c[2]) })
    } else if (!out.name) {
      // App 分享的網址常是「名稱, 地址」：拆開，避免標題變成一長串地址
      const parts = v.split(/\s*[,，]\s*/)
      out.name = parts[0].trim()
      if (parts.length > 1) out.address = v.trim()
    }
  }

  // @lat,lng,zoom（最後手段：畫面中心）
  if (out.lat == null) {
    const at = /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/.exec(full)
    if (at) {
      const lat = parseFloat(at[1]), lng = parseFloat(at[2])
      if (validCoord(lat, lng)) Object.assign(out, { lat, lng })
    }
  }
  if (out.lat == null) {
    const ll = u.searchParams.get('ll') || u.searchParams.get('center')
    const c = ll ? COORD_TEXT.exec(ll) : null
    if (c) Object.assign(out, { lat: parseFloat(c[1]), lng: parseFloat(c[2]) })
  }

  if (out.lat == null && !out.name) return null
  return out
}

/** 從 Google Maps 頁面 HTML 抓座標（og:image 的 staticmap center，或初始狀態中的畫面中心） */
export function extractCoordsFromMapsHtml(html: string): { lat: number; lng: number } | null {
  const m =
    /staticmap\?center=(-?\d+(?:\.\d+)?)(?:%2C|,)(-?\d+(?:\.\d+)?)/.exec(html) ||
    /APP_INITIALIZATION_STATE=\[\[\[[-\d.e]+,(-?\d+\.\d+),(-?\d+\.\d+)\]/.exec(html)
  if (!m) return null
  const isStatic = m[0].startsWith('staticmap')
  const lat = parseFloat(isStatic ? m[1] : m[2])
  const lng = parseFloat(isStatic ? m[2] : m[1])
  return validCoord(lat, lng) && !(lat === 0 && lng === 0) ? { lat, lng } : null
}

// 一般網頁：抓 og:title 或 <title>
export function extractTitle(html: string): string | undefined {
  const og = /<meta[^>]+property=["']og:title["'][^>]*content=["']([^"']+)["']/i.exec(html)
    || /<meta[^>]+content=["']([^"']+)["'][^>]*property=["']og:title["']/i.exec(html)
  const t = og?.[1] ?? /<title[^>]*>([^<]+)<\/title>/i.exec(html)?.[1]
  return t ? decodeEntities(t).replace(/\s+/g, ' ').trim().slice(0, 120) : undefined
}

function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
}
