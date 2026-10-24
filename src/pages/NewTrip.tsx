import { useState } from 'react'
import { Scene } from '../art/scenes.tsx'
import { THEMES } from '../data.ts'
import { api } from '../lib/api.ts'
import { sessions } from '../lib/session.ts'
import { navigate, onLinkClick } from '../lib/router.ts'
import { AnimalPicker, ColorPicker, Field } from '../components/ui.tsx'

export function guessTheme(dest: string): string {
  const d = dest.toLowerCase()
  if (/湯澤|滑雪|雪|苗場|白馬|二世谷|北海道|石打|妙高|藏王|ski|niseko/.test(d)) return 'snow'
  if (/京都|kyoto|奈良|nara/.test(d)) return 'kyoto'
  if (/大阪|osaka|神戶|關西/.test(d)) return 'osaka'
  if (/沖繩|okinawa|石垣|宮古/.test(d)) return 'okinawa'
  if (/首爾|seoul|韓國|釜山|korea/.test(d)) return 'seoul'
  if (/台北|台中|台南|高雄|台灣|花蓮|宜蘭|taiwan/.test(d)) return 'taiwan'
  if (/東京|tokyo|橫濱|日本|japan/.test(d)) return 'tokyo'
  return ''
}

export function ThemePicker({ value, onChange }: { value: string; onChange: (t: string) => void }) {
  return (
    <div className="grid2">
      {THEMES.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          aria-pressed={value === t.id}
          className="card flat"
          style={{ padding: 6, cursor: 'pointer', background: value === t.id ? 'var(--yellow)' : 'var(--white)', borderRadius: 18 }}
        >
          <Scene theme={t.id} className="mini" />
          <div className="small" style={{ marginTop: 4 }}>{t.name}</div>
        </button>
      ))}
    </div>
  )
}

export function NewTrip() {
  const [f, setF] = useState({ name: '', destination: '', theme: 'generic', startDate: '', endDate: '', createCode: '' })
  const [you, setYou] = useState({ name: '', animal: 'rabbit', color: 'coral' })
  const [pin, setPin] = useState('')
  const [themeTouched, setThemeTouched] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  function setDest(destination: string) {
    setF((s) => ({ ...s, destination, theme: themeTouched ? s.theme : guessTheme(destination) || s.theme }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    if (!/^\d{4}$/.test(pin)) return setErr('PIN 要是 4 位數字')
    if (f.endDate < f.startDate) return setErr('回程日不能早於出發日')
    setBusy(true)
    try {
      const res = await api<{ token: string; memberId: string; tripId: string }>('/trips', { body: { ...f, member: you, pin } })
      sessions.save({ ...res, name: f.name, theme: f.theme, startDate: f.startDate, endDate: f.endDate, destination: f.destination })
      navigate(`/t/${res.tripId}`, true)
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="page">
      <form className="stack lg" onSubmit={submit}>
        <div className="row">
          <a href="/" onClick={onLinkClick} className="icon-btn" aria-label="返回">←</a>
          <h1>開一團新旅行</h1>
        </div>
        <div className="scene-wrap">
          <Scene theme={f.theme} />
        </div>
        <section className="card stack">
          <h2>🧳 旅行資訊</h2>
          <Field label="旅行名稱">
            <input required maxLength={40} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="2027 湯澤石打丸滑雪" />
          </Field>
          <Field label="目的地">
            <input maxLength={40} value={f.destination} onChange={(e) => setDest(e.target.value)} placeholder="新潟・越後湯澤" />
          </Field>
          <div className="grid2">
            <Field label="出發日">
              <input type="date" required value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value, endDate: f.endDate || e.target.value })} />
            </Field>
            <Field label="回程日">
              <input type="date" required min={f.startDate} value={f.endDate} onChange={(e) => setF({ ...f, endDate: e.target.value })} />
            </Field>
          </div>
          <span className="small">插圖主題</span>
          <ThemePicker
            value={f.theme}
            onChange={(theme) => {
              setThemeTouched(true)
              setF({ ...f, theme })
            }}
          />
        </section>
        <section className="card stack">
          <h2>👑 你是團長</h2>
          <Field label="你的名字">
            <input required maxLength={20} value={you.name} onChange={(e) => setYou({ ...you, name: e.target.value })} placeholder="小明" />
          </Field>
          <span className="small">選一隻代表你的動物</span>
          <AnimalPicker value={you.animal} onChange={(animal) => setYou({ ...you, animal })} taken={new Set()} />
          <span className="small">你的顏色</span>
          <ColorPicker value={you.color} onChange={(color) => setYou({ ...you, color })} />
          <Field label="設定 4 位數 PIN（換手機時用來找回身分）">
            <input className="pin-input" inputMode="numeric" pattern="\d{4}" maxLength={4} required value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} />
          </Field>
        </section>
        <section className="card stack">
          <Field label="🔑 開團密碼（網站管理者設定的）">
            <input required type="password" value={f.createCode} onChange={(e) => setF({ ...f, createCode: e.target.value })} autoComplete="off" />
          </Field>
        </section>
        {err && <div className="error">{err}</div>}
        <button className="btn coral block" disabled={busy}>{busy ? '建立中…' : '建立旅行 🎉'}</button>
      </form>
    </main>
  )
}
