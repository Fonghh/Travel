// 從一段文字（截圖辨識、貼文說明）拆出地名與座標：純規則，不需要 AI

export interface ExtractedPlace {
  name: string
  /** 「地區｜名稱」格式裡的地區，用來縮小查詢範圍 */
  area?: string
  /** 查座標時依序嘗試的字串（日文名稱優先） */
  queries: string[]
  lat?: number
  lng?: number
}

const NUM = String.raw`(\d{1,3}(?:\.\d+)?)`
const DMS = String.raw`(\d{1,3})°\s*(\d{1,2})['′]\s*(\d{1,2}(?:\.\d+)?)["″]?`
const SEP = String.raw`[,，、\s]*`

const COORD_PATTERNS: { re: RegExp; read: (m: RegExpExecArray) => [number, number] }[] = [
  // 35°30'45.4"N 138°46'08.5"E（Google Maps 的格式）
  {
    re: new RegExp(`${DMS}\\s*([NS北南])${SEP}${DMS}\\s*([EW東西])`, 'i'),
    read: (m) => [dms(+m[1], +m[2], +m[3], m[4]), dms(+m[5], +m[6], +m[7], m[8])],
  },
  // 北35.51261° 東138.76903°、N35.5 E138.7
  {
    re: new RegExp(`([NS北南])\\s*${NUM}°?${SEP}([EW東西])\\s*${NUM}°?`, 'i'),
    read: (m) => [sign(+m[2], m[1]), sign(+m[4], m[3])],
  },
  // 35.51261°N 138.76903°E
  {
    re: new RegExp(`${NUM}°?\\s*([NS北南])${SEP}${NUM}°?\\s*([EW東西])`, 'i'),
    read: (m) => [sign(+m[1], m[2]), sign(+m[3], m[4])],
  },
  // (35.4990600, 138.7651600)：至少 3 位小數，避免誤判一般數字
  {
    re: /\(?\s*(-?\d{1,2}\.\d{3,})\s*[,，]\s*(-?\d{1,3}\.\d{3,})\s*\)?/,
    read: (m) => [+m[1], +m[2]],
  },
]

function sign(v: number, hemi: string) {
  return /[SW南西]/i.test(hemi) ? -v : v
}
function dms(d: number, m: number, s: number, hemi: string) {
  return sign(d + m / 60 + s / 3600, hemi)
}

export function findCoords(line: string): { lat: number; lng: number; match: string } | null {
  for (const p of COORD_PATTERNS) {
    const m = p.re.exec(line)
    if (!m) continue
    const [lat, lng] = p.read(m)
    if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0)) {
      return { lat: +lat.toFixed(6), lng: +lng.toFixed(6), match: m[0] }
    }
  }
  return null
}

const NUMBERED = /^\s*(?:[\d０-９]{1,3}\s*[・.．、)）:：\-–]|[①-⑳]|[(（][\d０-９]{1,3}[)）])\s*/u
const BULLET = /^\s*(?:[•·\-–—*＊●○◎◆◇■□▶►→]|\p{Extended_Pictographic}|️|⃣)+\s*/u
const KANA = /[぀-ヿ]/

function clean(line: string): string {
  let s = line
  for (let i = 0; i < 4; i++) s = s.replace(NUMBERED, '').replace(BULLET, '')
  return s
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[#＃@][^\s#＃@]+/g, '')
    .replace(/\p{Extended_Pictographic}️?/gu, '')
    .replace(/[\s。．.,，、!！?？~～:：]+$/u, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** 「產屋崎神社 産屋ヶ崎神社」→ 日文部分優先，再試整句、中文部分 */
export function searchQueries(name: string): string[] {
  const segs = name.split(' ').filter(Boolean)
  const tails: string[] = []
  const heads: string[] = []
  for (let k = 1; k < segs.length; k++) {
    const tail = segs.slice(k).join(' ')
    if (KANA.test(tail)) tails.push(tail)
    heads.push(segs.slice(0, k).join(' '))
  }
  // 含假名的後半段裡，最長的（保留地名前綴，例如「富士吉田 レトロ商店街」）
  tails.sort((a, b) => b.length - a.length)
  return [...new Set([...tails.slice(0, 1), name, ...heads.slice(0, 1), ...tails.slice(1)])]
}

/** 沒有編號時，句子（有句號、驚嘆號、逗號）多半是說明，不是地名 */
function isSentence(raw: string): boolean {
  const t = raw.replace(/https?:\/\/\S+/g, '').replace(/[#＃@][^\s#＃@]+/g, '').replace(/\p{Extended_Pictographic}\uFE0F?/gu, '').trim()
  return /[。！？!?]$/.test(t) || /[，。]/.test(t)
}

const ASCII = /^[\x00-\x7F]+$/
// 📍 之類的圖示常被截圖辨識成這些字，出現在地區最前面時去掉
const OCR_JUNK = /^[甲丫申由](?=\S{2,})/

/** 「富士市｜大淵笹場 Obuchi Sasaba」→ 地區、名稱 */
function splitArea(line: string): { area?: string; name: string } | null {
  const m = /^(.{1,14}?)\s*[｜|]\s*(.+)$/.exec(line)
  if (!m) return null
  const left = clean(m[1]).replace(OCR_JUNK, '')
  const name = clean(m[2])
  // 地區要有中日文、不能有數字（例如「11E15」是辨識錯的圖示）
  const area = /[\u3040-\u30ff\u4e00-\u9fff]/.test(left) && !/\d/.test(left) && left.length <= 12 ? left : undefined
  return { area, name }
}

/** 有地區時：中日文名稱＋地區最好查，再試整個名稱、英文名稱 */
export function areaQueries(name: string, area?: string): string[] {
  if (!area) return searchQueries(name)
  const words = name.split(' ').filter(Boolean)
  const cjk = words.filter((w) => !ASCII.test(w)).join(' ')
  const en = words.filter((w) => ASCII.test(w)).join(' ')
  const out: string[] = []
  if (cjk.length >= 2 && en && cjk !== area && !area.includes(cjk)) out.push(`${cjk} ${area}`)
  out.push(`${name} ${area}`)
  if (en.length >= 4 && cjk) out.push(`${en} ${area}`)
  out.push(name)
  if (cjk.length >= 2 && en) out.push(cjk)
  if (en.length >= 4 && cjk) out.push(en)
  return [...new Set(out)]
}

function looksLikePlace(s: string): boolean {
  if (!s || s.length < 2 || s.length > 40) return false
  if (/^[\d\s.,:/\-]+$/.test(s)) return false // 只有數字
  if (/(讚|留言|追蹤|分享|收藏|likes?|comments?|follow)\b/i.test(s) && s.length < 12) return false
  return true
}

export function extractPlaces(text: string): { places: ExtractedPlace[]; urls: string[] } {
  const urls = [...new Set(text.match(/https?:\/\/[^\s)）]+/g) ?? [])]
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  // 有編號清單（兩行以上）就只取編號的行，否則取看起來像地名的短行
  const numbered = lines.filter((l) => NUMBERED.test(l))
  const candidates = numbered.length >= 2 ? numbered : lines

  const places: ExtractedPlace[] = []
  const seen = new Set<string>()
  let coordCount = 0
  for (const raw of candidates) {
    const coord = findCoords(raw)
    if (coord) {
      const rest = clean(raw.replace(coord.match, ''))
      const name = looksLikePlace(rest) ? rest : `座標 ${++coordCount}`
      places.push({ name, queries: looksLikePlace(rest) ? searchQueries(rest) : [], lat: coord.lat, lng: coord.lng })
      continue
    }
    if (candidates !== numbered && isSentence(raw)) continue
    const split = splitArea(raw)
    const name = split ? split.name : clean(raw)
    if (!looksLikePlace(name) || seen.has(name)) continue
    seen.add(name)
    places.push({ name, area: split?.area, queries: areaQueries(name, split?.area) })
  }
  return { places, urls }
}
