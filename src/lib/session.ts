// 本機記住加入過的旅行（不需要帳號）
export interface SavedTrip {
  tripId: string
  token: string
  memberId: string
  name?: string
  theme?: string
  startDate?: string
  endDate?: string
  destination?: string
  invite?: string
}

const KEY = 'travel:sessions'

function read(): Record<string, SavedTrip> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}')
  } catch {
    return {}
  }
}
function write(v: Record<string, SavedTrip>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(v))
  } catch {
    /* 私密模式 */
  }
}

export const sessions = {
  all: () => Object.values(read()),
  get: (tripId: string): SavedTrip | undefined => read()[tripId],
  save(s: SavedTrip) {
    const all = read()
    all[s.tripId] = { ...all[s.tripId], ...s }
    write(all)
  },
  remove(tripId: string) {
    const all = read()
    delete all[tripId]
    write(all)
  },
}

export function local<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key)
    return v == null ? fallback : (JSON.parse(v) as T)
  } catch {
    return fallback
  }
}
export function setLocal(key: string, v: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(v))
  } catch {
    /* 忽略 */
  }
}
