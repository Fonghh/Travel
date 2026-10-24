import { test } from 'node:test'
import assert from 'node:assert/strict'
import { balances, settle } from '../shared/settle.ts'
import type { ExpenseData } from '../shared/types.ts'

const base = { title: 'x', category: 'food', date: '2027-03-05' } as const
const rates = { JPY: 0.2 }

test('平分＋日幣換算＋最少轉帳', () => {
  const ex: ExpenseData[] = [
    { ...base, amount: 30000, currency: 'JPY', payer: 'a', split: 'equal', among: ['a', 'b', 'c'] }, // 6000 台幣
    { ...base, amount: 900, currency: 'TWD', payer: 'b', split: 'equal', among: ['a', 'b', 'c'] },
  ]
  const { byMember } = balances(['a', 'b', 'c'], ex, [], rates)
  assert.equal(Math.round(byMember.a.balance), 6000 - 2300)
  const t = settle(byMember)
  assert.equal(t.length, 2)
  assert.deepEqual(t.reduce((s, x) => s + x.amount, 0), 3700)
  assert.ok(t.every((x) => x.to === 'a'))
})

test('已還款會抵銷，不分攤只算個人花費', () => {
  const ex: ExpenseData[] = [
    { ...base, amount: 1000, currency: 'TWD', payer: 'a', split: 'equal', among: ['a', 'b'] },
    { ...base, amount: 300, currency: 'TWD', payer: 'b', split: 'none', among: [] },
  ]
  const { byMember } = balances(['a', 'b'], ex, [{ from: 'b', to: 'a', amount: 500 }], rates)
  assert.deepEqual(settle(byMember), [])
  assert.equal(byMember.b.personal, 800)
})

test('指定金額', () => {
  const ex: ExpenseData[] = [
    { ...base, amount: 1000, currency: 'TWD', payer: 'a', split: 'custom', among: ['a', 'b'], custom: { a: 200, b: 800 } },
  ]
  assert.deepEqual(settle(balances(['a', 'b'], ex, [], rates).byMember), [{ from: 'b', to: 'a', amount: 800 }])
})

test('缺匯率會回報', () => {
  const ex: ExpenseData[] = [{ ...base, amount: 10, currency: 'USD', payer: 'a', split: 'equal', among: ['a', 'b'] }]
  assert.deepEqual(balances(['a', 'b'], ex, [], rates).missingRates, ['USD'])
})
