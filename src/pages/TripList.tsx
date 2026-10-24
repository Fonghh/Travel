import { useState } from 'react'
import { Scene } from '../art/scenes.tsx'
import { sessions } from '../lib/session.ts'
import { navigate, onLinkClick } from '../lib/router.ts'
import { inviteFrom } from '../lib/invite.ts'
import { fmtDate, todayIn } from '../lib/time.ts'
import { Empty } from '../components/ui.tsx'

const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true

function JoinByLink({ highlight }: { highlight: boolean }) {
  const [text, setText] = useState('')
  const [err, setErr] = useState('')
  return (
    <form
      className={'card stack' + (highlight ? ' yellow' : '')}
      style={{ gap: 8 }}
      onSubmit={(e) => {
        e.preventDefault()
        const code = inviteFrom(text)
        if (!code) return setErr('看不懂這個連結，請貼上完整的邀請連結')
        navigate(`/join/${code}`)
      }}
    >
      <h3>🔗 我有邀請連結</h3>
      {highlight && (
        <p className="small">
          從主畫面打開的 App 跟 Safari 的資料是分開的。請在 Safari 裡的「設定 → 分享邀請連結」複製連結，貼到這裡，再選自己、輸入 PIN 就能帶過來。
        </p>
      )}
      <div className="row">
        <input className="input grow" value={text} onChange={(e) => { setText(e.target.value); setErr('') }} placeholder="貼上邀請連結" inputMode="url" />
        <button className="btn sm">加入</button>
      </div>
      {err && <div className="small neg">{err}</div>}
    </form>
  )
}

export function TripList() {
  const trips = sessions.all().sort((a, b) => (a.startDate ?? '').localeCompare(b.startDate ?? ''))
  const today = todayIn()
  const upcoming = trips.filter((t) => (t.endDate ?? '9') >= today)
  const past = trips.filter((t) => (t.endDate ?? '9') < today)
  return (
    <main className="page stack lg">
      <div className="scene-wrap">
        <Scene theme="generic" />
      </div>
      <div className="center stack" style={{ gap: 4 }}>
        <h1>旅遊手帖</h1>
        <p className="muted">大家一起排行程，說走就走 ✈️</p>
      </div>
      {isStandalone() && !trips.length && <JoinByLink highlight />}
      <a className="btn coral block" href="/new" onClick={onLinkClick}>＋ 開一團新旅行</a>
      <section className="stack">
        <h2>我的旅行</h2>
        {!trips.length && <Empty icon="🧳">還沒有旅行。<br />收到朋友的邀請連結？直接點開，或貼到下面就能加入！</Empty>}
        {[...upcoming, ...past].map((t) => (
          <a key={t.tripId} className="card trip-card" href={`/t/${t.tripId}`} onClick={onLinkClick} style={{ opacity: past.includes(t) ? 0.6 : 1 }}>
            <Scene theme={t.theme ?? 'generic'} />
            <div className="stack" style={{ gap: 2 }}>
              <h3>{t.name ?? '旅行'}</h3>
              <span className="muted small">{t.destination}</span>
              {t.startDate && <span className="small">{fmtDate(t.startDate)} – {fmtDate(t.endDate!)}</span>}
            </div>
          </a>
        ))}
      </section>
      {!(isStandalone() && !trips.length) && <JoinByLink highlight={false} />}
    </main>
  )
}
