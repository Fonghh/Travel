import { useEffect, useState } from 'react'
import type { Member } from '../../shared/types.ts'
import { Scene } from '../art/scenes.tsx'
import { ANIMALS } from '../art/animals.tsx'
import { api } from '../lib/api.ts'
import { sessions } from '../lib/session.ts'
import { navigate } from '../lib/router.ts'
import { fmtDate } from '../lib/time.ts'
import { AnimalPicker, Avatar, ColorPicker, Field } from '../components/ui.tsx'

interface JoinInfo {
  trip: { id: string; name: string; destination: string; theme: string; startDate: string; endDate: string }
  members: Member[]
}

export function Join({ invite }: { invite: string }) {
  const [info, setInfo] = useState<JoinInfo>()
  const [err, setErr] = useState('')
  const [pick, setPick] = useState<Member | 'new'>()
  const [pin, setPin] = useState('')
  const [you, setYou] = useState({ name: '', animal: '', color: 'mizu' })
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api<JoinInfo>(`/join/${invite}`)
      .then((r) => {
        setInfo(r)
        const taken = new Set(r.members.map((m) => m.animal))
        setYou((y) => ({ ...y, animal: ANIMALS.find((a) => !taken.has(a.id))?.id ?? '' }))
      })
      .catch((e) => setErr(e.message))
  }, [invite])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!info || !pick) return
    if (!/^\d{4}$/.test(pin)) return setErr('PIN 要是 4 位數字')
    setErr('')
    setBusy(true)
    try {
      const body = pick === 'new' ? { ...you, pin } : { memberId: pick.id, pin }
      const res = await api<{ token: string; memberId: string; tripId: string }>(`/join/${invite}`, { body })
      sessions.save({ ...res, name: info.trip.name, theme: info.trip.theme, startDate: info.trip.startDate, endDate: info.trip.endDate, destination: info.trip.destination })
      navigate(`/t/${res.tripId}`, true)
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  if (!info) {
    return (
      <main className="page stack lg">
        {err ? <div className="error">{err}</div> : <p className="center muted">讀取中…</p>}
        <a className="btn white" href="/">回首頁</a>
      </main>
    )
  }

  const taken = new Set(info.members.map((m) => m.animal))
  return (
    <main className="page">
      <form className="stack lg" onSubmit={submit}>
        <div className="scene-wrap">
          <Scene theme={info.trip.theme} />
        </div>
        <div className="center stack" style={{ gap: 4 }}>
          <p className="muted">你被邀請加入</p>
          <h1>{info.trip.name}</h1>
          <p>{info.trip.destination}・{fmtDate(info.trip.startDate)} – {fmtDate(info.trip.endDate)}</p>
        </div>

        <section className="card stack">
          <h2>你是誰？</h2>
          <div className="row wrap">
            {info.members.map((m) => (
              <button
                key={m.id}
                type="button"
                className="animal-opt"
                aria-pressed={pick !== 'new' && pick?.id === m.id}
                onClick={() => setPick(m)}
                style={{ width: 76 }}
              >
                <Avatar m={m} size={46} />
                <span>{m.name}</span>
              </button>
            ))}
            <button type="button" className="animal-opt" aria-pressed={pick === 'new'} onClick={() => setPick('new')} style={{ width: 76 }}>
              <span style={{ fontSize: 30, lineHeight: '46px' }}>＋</span>
              <span>我是新成員</span>
            </button>
          </div>
        </section>

        {pick === 'new' && (
          <section className="card stack">
            <Field label="你的名字">
              <input required maxLength={20} value={you.name} onChange={(e) => setYou({ ...you, name: e.target.value })} />
            </Field>
            <span className="small">選一隻動物（灰色的已經有人選了）</span>
            <AnimalPicker value={you.animal} onChange={(animal) => setYou({ ...you, animal })} taken={taken} />
            <span className="small">你的顏色</span>
            <ColorPicker value={you.color} onChange={(color) => setYou({ ...you, color })} />
          </section>
        )}

        {pick && (
          <section className="card stack">
            <Field
              label={
                pick === 'new'
                  ? '設定 4 位數 PIN（換手機時用）'
                  : pick.hasPin
                    ? `輸入 ${pick.name} 的 PIN`
                    : '團長幫你重設了 PIN，請設定新的 4 位數 PIN'
              }
            >
              <input className="pin-input" inputMode="numeric" maxLength={4} required autoFocus value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} />
            </Field>
            {err && <div className="error">{err}</div>}
            <button className="btn coral block" disabled={busy}>{busy ? '加入中…' : '出發！'}</button>
            {pick !== 'new' && <p className="small muted center">忘記 PIN？請團長在「設定 → 成員」幫你重設。</p>}
          </section>
        )}
      </form>
    </main>
  )
}
