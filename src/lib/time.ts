const WEEK = '日一二三四五六'

export function parseDate(d: string): Date {
  const [y, m, day] = d.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, day))
}
export function fmtDate(d: string, withWeek = true): string {
  const dt = parseDate(d)
  return `${dt.getUTCMonth() + 1}/${dt.getUTCDate()}${withWeek ? `（${WEEK[dt.getUTCDay()]}）` : ''}`
}
export function weekday(d: string): string {
  return WEEK[parseDate(d).getUTCDay()]
}
export function addDays(d: string, n: number): string {
  const dt = parseDate(d)
  dt.setUTCDate(dt.getUTCDate() + n)
  return dt.toISOString().slice(0, 10)
}
export function dateRange(start: string, end: string): string[] {
  const out: string[] = []
  for (let d = start; d <= end && out.length < 60; d = addDays(d, 1)) out.push(d)
  return out
}
export function nightsBetween(a: string, b: string): number {
  return Math.round((parseDate(b).getTime() - parseDate(a).getTime()) / 86400000)
}

/** 某時區某一刻與 UTC 的差（毫秒） */
function tzOffset(ms: number, tz: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(ms))
  const g = (t: string) => Number(parts.find((p) => p.type === t)?.value)
  return Date.UTC(g('year'), g('month') - 1, g('day'), g('hour'), g('minute'), g('second')) - Math.floor(ms / 1000) * 1000
}

/** 「當地時間 YYYY-MM-DDTHH:mm」＋時區 → UTC 毫秒 */
export function zonedToUtc(local: string, tz: string): number {
  const [d, t = '00:00'] = local.split('T')
  const [y, m, day] = d.split('-').map(Number)
  const [hh, mm] = t.split(':').map(Number)
  const guess = Date.UTC(y, m - 1, day, hh, mm)
  try {
    let ms = guess - tzOffset(guess, tz)
    ms = guess - tzOffset(ms, tz)
    return ms
  } catch {
    return guess
  }
}

export function todayIn(tz = Intl.DateTimeFormat().resolvedOptions().timeZone): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: tz }).format(new Date())
}

export function durationText(ms: number): string {
  const m = Math.round(ms / 60000)
  const h = Math.floor(m / 60)
  return h ? `${h} 小時 ${m % 60 ? `${m % 60} 分` : ''}` : `${m} 分`
}

export function ago(ms: number): string {
  const s = (Date.now() - ms) / 1000
  if (s < 60) return '剛剛'
  if (s < 3600) return `${Math.floor(s / 60)} 分鐘前`
  if (s < 86400) return `${Math.floor(s / 3600)} 小時前`
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} 天前`
  const d = new Date(ms)
  return `${d.getMonth() + 1}/${d.getDate()}`
}
