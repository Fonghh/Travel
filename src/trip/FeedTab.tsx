import { useEffect, useState } from 'react'
import { useTrip } from '../lib/store.tsx'
import { setLocal } from '../lib/session.ts'
import { ago } from '../lib/time.ts'
import { Avatar, Empty } from '../components/ui.tsx'

export const lastSeenKey = (tripId: string) => `travel:lastSeen:${tripId}`

export function FeedTab() {
  const { state, me, member, list, save, remove, readOnly } = useTrip()
  const [text, setText] = useState('')
  const [pin, setPin] = useState(true)
  const announces = list('announce').sort((a, b) => Number(b.data.pinned) - Number(a.data.pinned) || b.createdAt - a.createdAt)

  useEffect(() => {
    const max = state.activity[0]?.id ?? 0
    setLocal(lastSeenKey(state.trip.id), max)
  }, [state.activity, state.trip.id])

  return (
    <>
      {!readOnly && (
        <form
          className="card yellow stack"
          onSubmit={(e) => {
            e.preventDefault()
            const t = text.trim()
            if (!t) return
            setText('')
            save('announce', { text: t, pinned: pin }, { activity: `發了公告 📢：${t.slice(0, 40)}` })
          }}
        >
          <h3>📢 發公告</h3>
          <textarea className="input" maxLength={500} value={text} onChange={(e) => setText(e.target.value)} placeholder="3/4 18:00 越後湯澤站東口集合！" style={{ minHeight: 70 }} />
          <div className="row between">
            <label className="check small"><input type="checkbox" checked={pin} onChange={(e) => setPin(e.target.checked)} /> 釘選在首頁</label>
            <button className="btn coral sm">發布</button>
          </div>
        </form>
      )}

      {announces.length > 0 && (
        <section className="stack">
          <h2>📌 公告</h2>
          {announces.map((a) => {
            const canEdit = !readOnly && (me.role === 'leader' || a.createdBy === me.id)
            return (
              <div key={a.id} className="announce" style={{ opacity: a.data.pinned ? 1 : 0.7 }}>
                <div className="row small muted" style={{ gap: 6 }}>
                  <Avatar m={member(a.createdBy)} size={22} /> {member(a.createdBy)?.name}・{ago(a.createdAt)}
                  {a.data.pinned && ' ・📌'}
                </div>
                <div style={{ whiteSpace: 'pre-wrap', marginTop: 4 }}>{a.data.text}</div>
                {canEdit && (
                  <div className="row" style={{ justifyContent: 'flex-end' }}>
                    <button className="link-btn small" onClick={() => save('announce', { ...a.data, pinned: !a.data.pinned }, { id: a.id })}>{a.data.pinned ? '取消釘選' : '釘選'}</button>
                    <button className="link-btn small" onClick={() => remove(a.id)}>刪除</button>
                  </div>
                )}
              </div>
            )
          })}
        </section>
      )}

      <section className="stack">
        <h2>🐾 最新動態</h2>
        {!state.activity.length && <Empty icon="🌱">還沒有動態</Empty>}
        {state.activity.map((a) => {
          const m = member(a.memberId)
          return (
            <div key={a.id} className="feed-item">
              <Avatar m={m} size={34} />
              <div className="bubble">
                <div><b>{m?.name ?? '已離開的成員'}</b> {a.text}</div>
                <div className="small muted">{ago(a.createdAt)}</div>
              </div>
            </div>
          )
        })}
      </section>
    </>
  )
}
