import type { ExpenseData, PaymentData } from './types.ts'

export type Rates = Record<string, number> // 1 單位外幣 = ? 台幣

export function toTwd(amount: number, currency: string, rates: Rates): number {
  if (currency === 'TWD') return amount
  const r = rates[currency]
  return r ? amount * r : NaN
}

/** 每個人應分攤的金額（原幣別）。none 代表不分攤，回傳空物件。 */
export function shares(e: ExpenseData): Record<string, number> {
  if (e.split === 'none') return {}
  if (e.split === 'custom') return { ...(e.custom ?? {}) }
  const n = e.among.length
  if (!n) return {}
  return Object.fromEntries(e.among.map((id) => [id, e.amount / n]))
}

export interface Balance {
  paid: number // 幫大家先付的（台幣，不含不分攤）
  owed: number // 自己應負擔
  balance: number // 正 = 別人欠我
  personal: number // 自己的總花費（含不分攤）
}

export function balances(
  memberIds: string[],
  expenses: ExpenseData[],
  payments: PaymentData[],
  rates: Rates,
): { byMember: Record<string, Balance>; missingRates: string[] } {
  const byMember: Record<string, Balance> = {}
  const missing = new Set<string>()
  const get = (id: string) => (byMember[id] ??= { paid: 0, owed: 0, balance: 0, personal: 0 })
  memberIds.forEach(get)
  for (const e of expenses) {
    const twd = toTwd(e.amount, e.currency, rates)
    if (Number.isNaN(twd)) {
      missing.add(e.currency)
      continue
    }
    const factor = e.amount ? twd / e.amount : 0
    if (e.split === 'none') {
      get(e.payer).personal += twd
      continue
    }
    get(e.payer).paid += twd
    get(e.payer).balance += twd
    for (const [id, amt] of Object.entries(shares(e))) {
      get(id).owed += amt * factor
      get(id).balance -= amt * factor
      get(id).personal += amt * factor
    }
  }
  for (const p of payments) {
    get(p.from).balance += p.amount
    get(p.to).balance -= p.amount
  }
  return { byMember, missingRates: [...missing] }
}

export interface Transfer { from: string; to: string; amount: number }

/** 最少轉帳次數（貪婪配對最大債務與最大債權），金額取整數台幣 */
export function settle(byMember: Record<string, Balance>): Transfer[] {
  const debtors: { id: string; amt: number }[] = []
  const creditors: { id: string; amt: number }[] = []
  for (const [id, b] of Object.entries(byMember)) {
    const v = Math.round(b.balance)
    if (v <= -1) debtors.push({ id, amt: -v })
    else if (v >= 1) creditors.push({ id, amt: v })
  }
  const out: Transfer[] = []
  while (debtors.length && creditors.length) {
    debtors.sort((a, b) => b.amt - a.amt)
    creditors.sort((a, b) => b.amt - a.amt)
    const d = debtors[0], c = creditors[0]
    const amt = Math.min(d.amt, c.amt)
    out.push({ from: d.id, to: c.id, amount: amt })
    d.amt -= amt
    c.amt -= amt
    if (d.amt < 1) debtors.shift()
    if (c.amt < 1) creditors.shift()
  }
  return out
}
