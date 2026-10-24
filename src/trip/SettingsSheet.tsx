import { useState } from 'react'
import { useTrip } from '../lib/store.tsx'
import { getMotion, setMotion } from '../lib/motion.ts'
import type { MotionPref } from '../lib/motion.ts'
import { sessions } from '../lib/session.ts'
import { navigate } from '../lib/router.ts'
import { ago } from '../lib/time.ts'
import { AnimalPicker, Avatar, ColorPicker, Field, Sheet } from '../components/ui.tsx'
import { ThemePicker } from '../pages/NewTrip.tsx'

export function SettingsSheet({ onClose }: { onClose: () => void }) {
  const { state, me } = useTrip()
  const [page, setPage] = useState<'main' | 'profile' | 'trip' | 'members' | 'trash'>('main')
  const leader = me.role === 'leader'
  const back = () => setPage('main')
  return (
    <Sheet title={{ main: '設定', profile: '我的資料', trip: '旅行資訊', members: '成員', trash: '最近刪除' }[page]} onClose={onClose}>
      {page === 'main' && (
        <div className="stack">
          <div className="row card flat">
            <Avatar m={me} size={52} />
            <div className="grow">
              <h3>{me.name}</h3>
              <div className="small muted">{leader ? '👑 團長' : '團員'}</div>
            </div>
            <button className="btn white sm" onClick={() => setPage('profile')}>編輯</button>
          </div>
          <Invite />
          <MotionSetting />
          <button className="btn white block" onClick={() => setPage('members')}>👥 成員（{state.members.length}）</button>
          {leader && <button className="btn white block" onClick={() => setPage('trip')}>🧳 修改旅行資訊</button>}
          <button className="btn white block" onClick={() => setPage('trash')}>🗑 最近刪除（7 天內可還原）</button>
          <button
            className="btn ghost block"
            onClick={() => {
              if (!confirm('要讓這台裝置登出這趟旅行嗎？之後可以用邀請連結＋PIN 再加入。')) return
              sessions.remove(state.trip.id)
              navigate('/', true)
            }}
          >
            這台裝置登出
          </button>
        </div>
      )}
      {page === 'profile' && <Profile onDone={back} />}
      {page === 'trip' && <TripInfo onDone={back} />}
      {page === 'members' && <Members />}
      {page === 'trash' && <Trash />}
      {page !== 'main' && <button className="btn white block" style={{ marginTop: 14 }} onClick={back}>← 返回</button>}
    </Sheet>
  )
}

function Invite() {
  const { state, toast } = useTrip()
  const url = `${location.origin}/join/${state.trip.inviteToken}`
  async function share() {
    const text = `一起來排「${state.trip.name}」的行程吧！`
    if (navigator.share) {
      try {
        await navigator.share({ title: state.trip.name, text, url })
        return
      } catch {
        /* 使用者取消 */
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      toast('邀請連結已複製 📋')
    } catch {
      prompt('複製這個連結傳給旅伴：', url)
    }
  }
  return (
    <div className="card flat yellow stack" style={{ gap: 6 }}>
      <h3>💌 邀請旅伴</h3>
      <p className="small">把連結傳到 LINE 群組，大家點開選自己、設 PIN 就能加入。</p>
      <button className="btn coral" onClick={share}>分享邀請連結</button>
    </div>
  )
}

function MotionSetting() {
  const [m, setM] = useState<MotionPref>(getMotion())
  const pick = (v: MotionPref) => {
    setM(v)
    setMotion(v)
  }
  return (
    <div className="card flat stack" style={{ gap: 6 }}>
      <h3>✨ 動態效果</h3>
      <div className="seg">
        <button aria-pressed={m === 'system'} onClick={() => pick('system')}>跟隨系統</button>
        <button aria-pressed={m === 'reduce'} onClick={() => pick('reduce')}>減少動態</button>
        <button aria-pressed={m === 'full'} onClick={() => pick('full')}>完整動畫</button>
      </div>
    </div>
  )
}

function Profile({ onDone }: { onDone: () => void }) {
  const { state, me, call } = useTrip()
  const [p, setP] = useState({ name: me.name, animal: me.animal, color: me.color })
  const [oldPin, setOldPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const taken = new Set(state.members.filter((m) => m.id !== me.id).map((m) => m.animal))
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const body: Record<string, string> = { ...p }
    if (newPin) Object.assign(body, { oldPin, newPin })
    if (await call('/me', body, 'PATCH')) onDone()
  }
  return (
    <form className="stack" onSubmit={submit}>
      <Field label="名字"><input required maxLength={20} value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} /></Field>
      <AnimalPicker value={p.animal} onChange={(animal) => setP({ ...p, animal })} taken={taken} />
      <ColorPicker value={p.color} onChange={(color) => setP({ ...p, color })} />
      <div className="card flat stack">
        <h3>更換 PIN（可不填）</h3>
        <div className="grid2">
          <Field label="舊 PIN"><input className="pin-input" inputMode="numeric" maxLength={4} value={oldPin} onChange={(e) => setOldPin(e.target.value.replace(/\D/g, ''))} /></Field>
          <Field label="新 PIN"><input className="pin-input" inputMode="numeric" maxLength={4} value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))} /></Field>
        </div>
      </div>
      <button className="btn coral block">儲存</button>
    </form>
  )
}

function TripInfo({ onDone }: { onDone: () => void }) {
  const { state, patchTrip } = useTrip()
  const t = state.trip
  const [f, setF] = useState({ name: t.name, destination: t.destination, theme: t.theme, startDate: t.startDate, endDate: t.endDate })
  return (
    <form
      className="stack"
      onSubmit={async (e) => {
        e.preventDefault()
        if (await patchTrip({ ...f, activity: '更新了旅行資訊' })) onDone()
      }}
    >
      <Field label="旅行名稱"><input required maxLength={40} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
      <Field label="目的地"><input maxLength={40} value={f.destination} onChange={(e) => setF({ ...f, destination: e.target.value })} /></Field>
      <div className="grid2">
        <Field label="出發日"><input type="date" required value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value })} /></Field>
        <Field label="回程日"><input type="date" required min={f.startDate} value={f.endDate} onChange={(e) => setF({ ...f, endDate: e.target.value })} /></Field>
      </div>
      <ThemePicker value={f.theme} onChange={(theme) => setF({ ...f, theme })} />
      <button className="btn coral block">儲存</button>
    </form>
  )
}

function Members() {
  const { state, me, call, toast } = useTrip()
  const leader = me.role === 'leader'
  return (
    <div className="list">
      {state.members.map((m) => (
        <div key={m.id} className="todo" style={{ flexWrap: 'wrap' }}>
          <Avatar m={m} size={36} />
          <div className="grow">
            {m.name} {m.role === 'leader' && '👑'} {m.id === me.id && <span className="small muted">（你）</span>}
            {!m.hasPin && <div className="small neg">PIN 已重設，等他重新設定</div>}
          </div>
          {leader && m.id !== me.id && (
            <div className="row wrap" style={{ gap: 4, width: '100%', justifyContent: 'flex-end' }}>
              <button
                className="btn white sm"
                onClick={async () => {
                  if (!confirm(`要重設 ${m.name} 的 PIN 嗎？他下次登入時可以設定新的 PIN。`)) return
                  if (await call(`/members/${m.id}/reset-pin`)) toast(`已重設，請 ${m.name} 用邀請連結重新設定`)
                }}
              >
                重設 PIN
              </button>
              <button className="btn white sm" onClick={() => call(`/members/${m.id}/role`, { role: m.role === 'leader' ? 'member' : 'leader' })}>
                {m.role === 'leader' ? '取消團長' : '設為團長'}
              </button>
              <button className="btn white sm" onClick={() => confirm(`確定要把 ${m.name} 移出旅行嗎？`) && call(`/members/${m.id}/remove`)}>移除</button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

const KIND_LABEL: Record<string, string> = { item: '行程', flight: '航班', stay: '住宿', todo: '待辦', expense: '記帳', payment: '還款', announce: '公告' }

function Trash() {
  const { state, restore, member, readOnly } = useTrip()
  const deleted = state.entities.filter((e) => e.deletedAt && KIND_LABEL[e.kind]).sort((a, b) => b.deletedAt! - a.deletedAt!)
  if (!deleted.length) return <p className="muted center">沒有最近刪除的項目</p>
  return (
    <div className="list">
      {deleted.map((e) => {
        const d = e.data as unknown as Record<string, string>
        return (
          <div key={e.id} className="todo">
            <span className="tag">{KIND_LABEL[e.kind]}</span>
            <div className="grow">
              <div className="ellipsis">{d.title || d.name || d.text || d.flightNo || '—'}</div>
              <div className="small muted">{member(e.updatedBy)?.name} 刪除・{ago(e.deletedAt!)}</div>
            </div>
            {!readOnly && <button className="btn sm" onClick={() => restore(e.id)}>還原</button>}
          </div>
        )
      })}
    </div>
  )
}
