import { Scene } from '../art/scenes.tsx'
import { sessions } from '../lib/session.ts'
import { onLinkClick } from '../lib/router.ts'
import { fmtDate, todayIn } from '../lib/time.ts'
import { Empty } from '../components/ui.tsx'

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
      <a className="btn coral block" href="/new" onClick={onLinkClick}>＋ 開一團新旅行</a>
      <section className="stack">
        <h2>我的旅行</h2>
        {!trips.length && <Empty icon="🧳">還沒有旅行。<br />收到朋友的邀請連結？直接點開就能加入！</Empty>}
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
    </main>
  )
}
