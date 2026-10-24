import { useMemo, useState } from 'react'
import type { Entity, ExpenseData } from '../../shared/types.ts'
import { balances, settle, toTwd } from '../../shared/settle.ts'
import { CATEGORIES, CURRENCIES } from '../data.ts'
import { api } from '../lib/api.ts'
import { useTrip } from '../lib/store.tsx'
import { local, setLocal } from '../lib/session.ts'
import { ago, fmtDate, todayIn } from '../lib/time.ts'
import { Avatar, Empty, Field, money, Sheet } from '../components/ui.tsx'

export function MoneyTab() {
  const { state, list, me, member, save, remove, readOnly } = useTrip()
  const [edit, setEdit] = useState<Entity<'expense'> | 'new'>()
  const [fxOpen, setFxOpen] = useState(false)
  const s = state.trip.settings
  const rates = { ...(s.fx ?? {}), TWD: 1 }
  const expenses = list('expense').sort((a, b) => b.data.date.localeCompare(a.data.date) || b.createdAt - a.createdAt)
  const payments = list('payment').sort((a, b) => b.createdAt - a.createdAt)
  const memberIds = state.members.map((m) => m.id)
  const { byMember, missingRates } = useMemo(
    () => balances(memberIds, expenses.map((e) => e.data), payments.map((p) => p.data), rates),
    [state.version, JSON.stringify(rates)],
  )
  const transfers = settle(byMember)
  const mine = byMember[me.id]
  const leader = me.role === 'leader'
  const locked = !!s.expensesLocked

  async function markPaid(t: { from: string; to: string; amount: number }) {
    await save('payment', t, { activity: `記錄 ${member(t.from)?.name} 已還給 ${member(t.to)?.name} ${money(t.amount)} 💸` })
  }

  return (
    <>
      <section className="card yellow stack" style={{ gap: 6 }}>
        <div className="row between">
          <span>我的旅費（換算台幣）</span>
          <b className="money" style={{ fontSize: '1.4rem' }}>{money(Math.round(mine?.personal ?? 0))}</b>
        </div>
        <div className="row between small">
          <span>我先墊付</span>
          <span className="money">{money(Math.round(mine?.paid ?? 0))}</span>
        </div>
        <div className="row between">
          <span>{(mine?.balance ?? 0) >= 0 ? '別人要給我' : '我還要給別人'}</span>
          <b className={'money ' + ((mine?.balance ?? 0) >= 0 ? 'pos' : 'neg')}>{money(Math.abs(Math.round(mine?.balance ?? 0)))}</b>
        </div>
      </section>

      {missingRates.length > 0 && <div className="banner warn">⚠️ 缺少匯率：{missingRates.join('、')}，這些支出暫時沒算進去，請團長設定匯率。</div>}

      <section className="stack">
        <div className="row between">
          <h2>🤝 結算：誰給誰</h2>
          <span className="small muted">最少 {transfers.length} 筆轉帳</span>
        </div>
        {!transfers.length && <Empty icon="🎉">目前大家都兩清了！</Empty>}
        {transfers.map((t, i) => (
          <div key={i} className="todo">
            <Avatar m={member(t.from)} size={30} />
            <span>→</span>
            <Avatar m={member(t.to)} size={30} />
            <div className="grow small">
              {member(t.from)?.name} 給 {member(t.to)?.name}
              <div className="money" style={{ fontSize: '1.05rem' }}>{money(t.amount)}</div>
            </div>
            {!state.trip.settings.closed && (leader || t.from === me.id || t.to === me.id) && (
              <button className="btn green sm" onClick={() => markPaid(t)} disabled={!state.trip.settings.closed && readOnly}>✔ 已還款</button>
            )}
          </div>
        ))}
        <p className="small muted">換算匯率：{Object.entries(s.fx ?? {}).map(([k, v]) => `1 ${k} = ${v} TWD`).join('、') || '尚未設定'}</p>
      </section>

      <section className="stack">
        <h2>👛 每個人</h2>
        <div className="card flat" style={{ padding: 10 }}>
          {state.members.map((m) => {
            const b = byMember[m.id]
            return (
              <div key={m.id} className="row" style={{ padding: '4px 0' }}>
                <Avatar m={m} size={28} />
                <span className="grow ellipsis">{m.name}</span>
                <span className="small muted money">墊 {money(Math.round(b?.paid ?? 0))}</span>
                <b className={'money ' + ((b?.balance ?? 0) >= 0 ? 'pos' : 'neg')} style={{ minWidth: 86, textAlign: 'right' }}>
                  {(b?.balance ?? 0) >= 0 ? '+' : '−'}{money(Math.abs(Math.round(b?.balance ?? 0)))}
                </b>
              </div>
            )
          })}
        </div>
      </section>

      <section className="stack">
        <h2>🧾 支出（{expenses.length}）</h2>
        {!expenses.length && <Empty icon="💴">還沒有記帳。誰先付了錢，按＋記下來！</Empty>}
        {expenses.map((e) => {
          const cat = CATEGORIES.find((c) => c.id === e.data.category)
          const who = member(e.data.payer)
          return (
            <button key={e.id} className="todo" style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => setEdit(e)}>
              <span style={{ fontSize: 22 }}>{cat?.icon}</span>
              <div className="grow">
                <div className="ellipsis">{e.data.title || cat?.label}</div>
                <div className="small muted">
                  {fmtDate(e.data.date, false)}・{who?.name} 付・
                  {e.data.split === 'none' ? '不分攤' : `${e.data.split === 'custom' ? Object.keys(e.data.custom ?? {}).length : e.data.among.length} 人分`}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="money">{money(e.data.amount, e.data.currency)}</div>
                {e.data.currency !== 'TWD' && <div className="small muted money">≈ {money(Math.round(toTwd(e.data.amount, e.data.currency, rates) || 0))}</div>}
              </div>
            </button>
          )
        })}
      </section>

      {payments.length > 0 && (
        <section className="stack">
          <h2>📒 還款紀錄</h2>
          {payments.map((p) => (
            <div key={p.id} className="todo small">
              <Avatar m={member(p.data.from)} size={24} />→<Avatar m={member(p.data.to)} size={24} />
              <span className="grow">{member(p.data.from)?.name} 還 {member(p.data.to)?.name} <b className="money">{money(p.data.amount)}</b><br /><span className="muted">{ago(p.createdAt)}</span></span>
              {!readOnly && (leader || p.data.from === me.id || p.data.to === me.id) && (
                <button className="link-btn small" onClick={() => remove(p.id, `撤銷了一筆還款紀錄（${money(p.data.amount)}）`)}>撤銷</button>
              )}
            </div>
          ))}
        </section>
      )}

      {leader && (
        <section className="card stack">
          <h2>👑 團長工具</h2>
          <button className="btn white block" onClick={() => setFxOpen(true)} disabled={readOnly}>💱 設定匯率</button>
          <LeaderLockButtons />
        </section>
      )}
      {locked && <div className="banner">🔒 團長已鎖定結算，不能再新增或修改支出，還款照常記錄。</div>}

      {!readOnly && !locked && <button className="fab" onClick={() => setEdit('new')} aria-label="新增支出">＋</button>}
      {edit && <ExpenseEditor expense={edit === 'new' ? undefined : edit} onClose={() => setEdit(undefined)} />}
      {fxOpen && <FxSheet onClose={() => setFxOpen(false)} />}
    </>
  )
}

function LeaderLockButtons() {
  const { state, patchTrip } = useTrip()
  const s = state.trip.settings
  return (
    <>
      <button
        className="btn white block"
        disabled={s.closed}
        onClick={() => patchTrip({ settings: { expensesLocked: !s.expensesLocked }, activity: s.expensesLocked ? '解除了結算鎖定 🔓' : '鎖定了結算 🔒 大家可以開始還款囉' })}
      >
        {s.expensesLocked ? '🔓 解除結算鎖定' : '🔒 鎖定結算（不能再記帳）'}
      </button>
      <button
        className={'btn block ' + (s.closed ? 'white' : 'coral')}
        onClick={() => {
          if (!s.closed && !confirm('確定要結案嗎？結案後所有資料都只能查看。')) return
          patchTrip({ settings: { closed: !s.closed }, activity: s.closed ? '重新開啟了旅行' : '宣布旅行結案 🎉 辛苦大家了！' })
        }}
      >
        {s.closed ? '重新開啟旅行' : '🎉 整趟旅行結案'}
      </button>
    </>
  )
}

function FxSheet({ onClose }: { onClose: () => void }) {
  const { state, token, patchTrip, toast } = useTrip()
  const [fx, setFx] = useState<Record<string, string>>(() =>
    Object.fromEntries(CURRENCIES.filter((c) => c !== 'TWD').map((c) => [c, String(state.trip.settings.fx?.[c] ?? '')])),
  )
  async function fetchFx() {
    try {
      const r = await api<Record<string, number>>(`/t/${state.trip.id}/fx`, { token })
      setFx((x) => ({ ...x, ...Object.fromEntries(Object.entries(r).map(([k, v]) => [k, String(v)])) }))
      toast('已抓到今天的匯率，記得按儲存')
    } catch (e) {
      toast((e as Error).message)
    }
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const out: Record<string, number> = {}
    for (const [k, v] of Object.entries(fx)) if (Number(v) > 0) out[k] = Number(v)
    onClose()
    await patchTrip({ settings: { fx: out }, activity: '更新了結算匯率 💱' })
  }
  return (
    <Sheet title="💱 結算匯率" onClose={onClose}>
      <form className="stack" onSubmit={submit}>
        <p className="small muted">1 單位外幣 = 多少台幣。可以抓今天的匯率，也可以改成你們實際換匯的匯率。</p>
        <button type="button" className="btn mizu" onClick={fetchFx}>抓今天的匯率</button>
        <div className="grid2">
          {Object.keys(fx).map((c) => (
            <Field key={c} label={`1 ${c} =`}>
              <input inputMode="decimal" value={fx[c]} onChange={(e) => setFx({ ...fx, [c]: e.target.value })} placeholder="TWD" />
            </Field>
          ))}
        </div>
        <button className="btn coral block">儲存</button>
      </form>
    </Sheet>
  )
}

const LAST_CUR = 'travel:lastCurrency'

function ExpenseEditor({ expense, onClose }: { expense?: Entity<'expense'>; onClose: () => void }) {
  const { state, me, list, save, remove } = useTrip()
  const today = todayIn()
  const [d, setD] = useState<ExpenseData>(
    expense?.data ?? {
      title: '', amount: 0, currency: local(LAST_CUR, 'JPY'), category: 'food', payer: me.id,
      date: today >= state.trip.startDate && today <= state.trip.endDate ? today : state.trip.startDate,
      split: 'equal', among: state.members.map((m) => m.id),
    },
  )
  const [amountText, setAmountText] = useState(expense ? String(expense.data.amount) : '')
  const set = <K extends keyof ExpenseData>(k: K, v: ExpenseData[K]) => setD((x) => ({ ...x, [k]: v }))
  const dayItems = list('item').filter((i) => i.data.date === d.date)
  const amount = Number(amountText) || 0
  const customSum = Object.values(d.custom ?? {}).reduce((a, b) => a + (b || 0), 0)
  const customOk = d.split !== 'custom' || Math.abs(customSum - amount) < 0.01
  const amongSet = new Set(d.among)

  function linkItem(id: string) {
    const it = dayItems.find((i) => i.id === id)
    setD((x) => ({
      ...x,
      itemId: id || undefined,
      title: x.title || it?.data.title || '',
      among: it ? (it.data.participants === 'all' ? state.members.map((m) => m.id) : it.data.participants) : x.among,
    }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (amount <= 0 || !customOk) return
    if (d.split === 'equal' && !d.among.length) return
    const data: ExpenseData = {
      ...d,
      amount,
      custom: d.split === 'custom' ? Object.fromEntries(Object.entries(d.custom ?? {}).filter(([, v]) => v > 0)) : undefined,
    }
    setLocal(LAST_CUR, d.currency)
    onClose()
    await save('expense', data, { id: expense?.id, activity: `${expense ? '修改' : '記了'}一筆帳「${d.title || '支出'}」${money(amount, d.currency)}` })
  }

  return (
    <Sheet title={expense ? '編輯支出' : '記一筆帳'} onClose={onClose}>
      <form className="stack" onSubmit={submit}>
        <div className="row">
          <select className="input" style={{ width: 110 }} value={d.currency} onChange={(e) => set('currency', e.target.value)} aria-label="幣別">
            {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <input className="input grow" required inputMode="decimal" value={amountText} onChange={(e) => setAmountText(e.target.value.replace(/[^\d.]/g, ''))} placeholder="金額" style={{ fontSize: '1.3rem' }} />
        </div>
        <Field label="項目"><input maxLength={60} value={d.title} onChange={(e) => set('title', e.target.value)} placeholder="燒肉晚餐" /></Field>
        <div className="seg">
          {CATEGORIES.map((c) => <button key={c.id} type="button" aria-pressed={d.category === c.id} onClick={() => set('category', c.id)}>{c.icon} {c.label}</button>)}
        </div>
        <div className="grid2">
          <Field label="誰付的">
            <select value={d.payer} onChange={(e) => set('payer', e.target.value)}>
              {state.members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </Field>
          <Field label="日期"><input type="date" value={d.date} onChange={(e) => set('date', e.target.value)} /></Field>
        </div>
        {dayItems.length > 0 && (
          <Field label="連結到行程（可不選）">
            <select value={d.itemId ?? ''} onChange={(e) => linkItem(e.target.value)}>
              <option value="">—</option>
              {dayItems.map((i) => <option key={i.id} value={i.id}>{i.data.time} {i.data.title}</option>)}
            </select>
          </Field>
        )}
        <span className="small">怎麼分？</span>
        <div className="seg">
          <button type="button" aria-pressed={d.split === 'equal'} onClick={() => set('split', 'equal')}>平分</button>
          <button type="button" aria-pressed={d.split === 'custom'} onClick={() => set('split', 'custom')}>指定金額</button>
          <button type="button" aria-pressed={d.split === 'none'} onClick={() => set('split', 'none')}>不分攤（自己的）</button>
        </div>
        {d.split === 'equal' && (
          <>
            <div className="row between small">
              <span>分給 {d.among.length} 人{d.among.length ? `，每人 ${money(amount / d.among.length, d.currency)}` : ''}</span>
              <button type="button" className="link-btn small" onClick={() => set('among', amongSet.size === state.members.length ? [] : state.members.map((m) => m.id))}>
                {amongSet.size === state.members.length ? '全不選' : '全選'}
              </button>
            </div>
            <div className="row wrap" style={{ gap: 6 }}>
              {state.members.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className="checkin"
                  style={{ background: amongSet.has(m.id) ? 'var(--yellow)' : 'var(--white)', opacity: amongSet.has(m.id) ? 1 : 0.5, cursor: 'pointer' }}
                  onClick={() => set('among', amongSet.has(m.id) ? d.among.filter((x) => x !== m.id) : [...d.among, m.id])}
                >
                  <Avatar m={m} size={22} /> {m.name}
                </button>
              ))}
            </div>
          </>
        )}
        {d.split === 'custom' && (
          <div className="stack" style={{ gap: 6 }}>
            {state.members.map((m) => (
              <div key={m.id} className="row">
                <Avatar m={m} size={26} />
                <span className="grow">{m.name}</span>
                <input
                  className="input"
                  style={{ width: 120, minHeight: 38 }}
                  inputMode="decimal"
                  value={d.custom?.[m.id] ?? ''}
                  onChange={(e) => set('custom', { ...(d.custom ?? {}), [m.id]: Number(e.target.value.replace(/[^\d.]/g, '')) || 0 })}
                />
              </div>
            ))}
            <div className={'small ' + (customOk ? 'pos' : 'neg')}>
              已分配 {money(customSum, d.currency)} / {money(amount, d.currency)}{!customOk && `（還差 ${money(amount - customSum, d.currency)}）`}
            </div>
          </div>
        )}
        <button className="btn coral block" disabled={!customOk || amount <= 0}>儲存</button>
        {expense && (
          <button type="button" className="btn ghost block" onClick={() => { onClose(); remove(expense.id, `刪除了一筆帳「${d.title}」`) }}>🗑 刪除這筆</button>
        )}
      </form>
    </Sheet>
  )
}
