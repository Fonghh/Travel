import { useState } from 'react'
import type { Entity, TodoType } from '../../shared/types.ts'
import { useTrip } from '../lib/store.tsx'
import { Avatar, AvatarStack, Empty } from '../components/ui.tsx'

const SECTIONS: { type: TodoType; title: string; hint: string; placeholder: string }[] = [
  { type: 'shared', title: '🤝 共用待辦', hint: '一個人完成就打勾', placeholder: '訂 3/5 晚餐餐廳' },
  { type: 'each', title: '🙋 每人都要做', hint: '每個人各自打勾', placeholder: '帶護照、租雪具' },
  { type: 'private', title: '🔒 我的私人待辦', hint: '只有你看得到', placeholder: '買行動電源' },
]

export function TodoTab() {
  const { list } = useTrip()
  const todos = list('todo').sort((a, b) => a.createdAt - b.createdAt)
  return (
    <>
      {SECTIONS.map((s) => (
        <section key={s.type} className="stack">
          <div>
            <h2>{s.title}</h2>
            <p className="small muted">{s.hint}</p>
          </div>
          <div className="list">
            {todos.filter((t) => t.data.type === s.type).map((t) => <TodoRow key={t.id} t={t} />)}
          </div>
          <AddTodo type={s.type} placeholder={s.placeholder} />
        </section>
      ))}
      {!todos.length && <Empty icon="📝">出發前要準備什麼？先列下來吧！</Empty>}
    </>
  )
}

function TodoRow({ t }: { t: Entity<'todo'> }) {
  const { state, me, member, list, save, remove, readOnly } = useTrip()
  const [open, setOpen] = useState(false)
  const d = t.data

  if (d.type === 'each') {
    const checks = list('check').filter((c) => c.data.todoId === t.id)
    const doneIds = new Set(checks.map((c) => c.data.memberId))
    const mine = doneIds.has(me.id)
    const total = state.members.length
    const pending = state.members.filter((m) => !doneIds.has(m.id))
    return (
      <div className={'todo' + (mine ? ' done' : '')} style={{ flexWrap: 'wrap' }}>
        <button
          className="box"
          role="checkbox"
          aria-checked={mine}
          disabled={readOnly}
          onClick={() => (mine ? remove(`${t.id}:${me.id}`) : save('check', { todoId: t.id, memberId: me.id }, { id: `${t.id}:${me.id}` }))}
        >
          {mine ? '✓' : ''}
        </button>
        <div className="grow">
          <div className="todo-title">{d.title}</div>
          <div className="row" style={{ gap: 6 }}>
            <div className="progress grow"><div style={{ width: `${(doneIds.size / total) * 100}%` }} /></div>
            <button className="link-btn small" onClick={() => setOpen(!open)}>{doneIds.size}/{total} 人</button>
          </div>
        </div>
        {!readOnly && <button className="link-btn small muted" onClick={() => remove(t.id, `刪除了待辦「${d.title}」`)} aria-label="刪除">✕</button>}
        {open && (
          <div className="small" style={{ width: '100%' }}>
            {pending.length ? <div className="row wrap">還沒勾：<AvatarStack members={pending} size={24} max={30} /></div> : '🎉 大家都完成了！'}
          </div>
        )}
      </div>
    )
  }

  const done = !!d.done
  const toggle = () =>
    save('todo', { ...d, done: done ? null : { by: me.id, at: Date.now() } }, {
      id: t.id,
      activity: d.type === 'shared' ? (done ? `取消完成「${d.title}」` : `完成了待辦「${d.title}」✅`) : undefined,
    })
  return (
    <div className={'todo' + (done ? ' done' : '')}>
      <button className="box" role="checkbox" aria-checked={done} disabled={readOnly} onClick={toggle}>{done ? '✓' : ''}</button>
      <div className="grow">
        <div className="todo-title">{d.title}</div>
        {d.type === 'shared' && d.done && (
          <div className="row small muted" style={{ gap: 4 }}><Avatar m={member(d.done.by)} size={20} /> {member(d.done.by)?.name} 完成</div>
        )}
      </div>
      {!readOnly && (
        <button className="link-btn small muted" onClick={() => remove(t.id, d.type === 'private' ? undefined : `刪除了待辦「${d.title}」`)} aria-label="刪除">✕</button>
      )}
    </div>
  )
}

function AddTodo({ type, placeholder }: { type: TodoType; placeholder: string }) {
  const { me, save, readOnly } = useTrip()
  const [text, setText] = useState('')
  if (readOnly) return null
  return (
    <form
      className="row"
      onSubmit={(e) => {
        e.preventDefault()
        const title = text.trim()
        if (!title) return
        setText('')
        save('todo', { title, type, ...(type === 'private' ? { owner: me.id } : {}) }, { activity: type === 'private' ? undefined : `新增了待辦「${title}」` })
      }}
    >
      <input className="input grow" maxLength={80} value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} />
      <button className="btn sm">＋</button>
    </form>
  )
}
