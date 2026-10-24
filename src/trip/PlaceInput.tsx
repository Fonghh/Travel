import { useState } from 'react'
import { api } from '../lib/api.ts'
import { useTrip } from '../lib/store.tsx'

export interface PickedPlace {
  name?: string
  address?: string
  lat?: number
  lng?: number
  url?: string
}

/** 貼 Google Maps／任何網址匯入，或用名稱搜尋地點 */
export function PlaceInput({ value, onPick }: { value: { lat?: number; lng?: number; placeName?: string; name?: string }; onPick: (p: PickedPlace) => void }) {
  const { state, token } = useTrip()
  const [mode, setMode] = useState<'url' | 'search'>('url')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [results, setResults] = useState<{ name: string; address: string; lat: number; lng: number }[]>([])

  async function importUrl(raw = text) {
    const url = raw.trim().match(/https?:\/\/\S+/)?.[0]
    if (!url) return setMsg('找不到網址，請貼上 https:// 開頭的連結')
    setBusy(true)
    setMsg('')
    try {
      const r = await api<{ type: string; url: string; name?: string; address?: string; lat?: number; lng?: number }>(`/t/${state.trip.id}/resolve-url`, { token, body: { url } })
      onPick({ name: r.name, address: r.address, lat: r.lat, lng: r.lng, url: r.url })
      setMsg(r.lat != null ? `✔ 匯入成功${r.name ? `：${r.name}` : ''}` : r.name ? `✔ 抓到標題：${r.name}（沒有座標，可以再用「搜尋地點」補上）` : '已存成連結，但抓不到名稱，請手動填寫')
      setText('')
    } catch (e) {
      setMsg((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function search() {
    if (!text.trim()) return
    setBusy(true)
    setMsg('')
    try {
      const r = await api<typeof results>(`/t/${state.trip.id}/geocode?q=${encodeURIComponent(text.trim())}`, { token })
      setResults(r)
      if (!r.length) setMsg('找不到，換個關鍵字試試（日文或英文名稱通常比較準）')
    } catch (e) {
      setMsg((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const has = value.lat != null && value.lng != null
  return (
    <div className="card flat yellow stack" style={{ padding: 12, gap: 8 }}>
      <div className="row between">
        <div className="seg">
          <button type="button" aria-pressed={mode === 'url'} onClick={() => { setMode('url'); setResults([]) }}>🔗 貼網址匯入</button>
          <button type="button" aria-pressed={mode === 'search'} onClick={() => setMode('search')}>🔍 搜尋地點</button>
        </div>
      </div>
      <div className="row">
        <input
          className="input grow"
          value={text}
          inputMode={mode === 'url' ? 'url' : 'search'}
          placeholder={mode === 'url' ? '貼上 Google Maps、Tabelog… 網址' : '例如：越後湯澤站'}
          onChange={(e) => setText(e.target.value)}
          onPaste={(e) => {
            if (mode !== 'url') return
            const pasted = e.clipboardData.getData('text')
            if (/https?:\/\//.test(pasted)) {
              e.preventDefault()
              setText(pasted)
              importUrl(pasted)
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              if (mode === 'url') importUrl()
              else search()
            }
          }}
        />
        <button type="button" className="btn sm" disabled={busy} onClick={() => (mode === 'url' ? importUrl() : search())}>
          {busy ? '…' : mode === 'url' ? '匯入' : '搜尋'}
        </button>
      </div>
      {results.length > 0 && (
        <div className="list">
          {results.map((r, i) => (
            <button
              key={i}
              type="button"
              className="todo"
              style={{ textAlign: 'left', cursor: 'pointer' }}
              onClick={() => {
                onPick({ name: r.name, lat: r.lat, lng: r.lng })
                setResults([])
                setText('')
                setMsg(`✔ 已選：${r.name}`)
              }}
            >
              <div className="grow">
                <div>{r.name}</div>
                <div className="small muted ellipsis">{r.address}</div>
              </div>
            </button>
          ))}
        </div>
      )}
      {msg && <div className="small">{msg}</div>}
      {has && (
        <div className="row small">
          <span className="grow">📍 已有座標，會出現在地圖上</span>
          <button type="button" className="link-btn small" onClick={() => onPick({ name: value.placeName ?? value.name, lat: undefined, lng: undefined })}>清除</button>
        </div>
      )}
    </div>
  )
}
