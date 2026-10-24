import { test } from 'node:test'
import assert from 'node:assert/strict'
import { inviteFrom } from '../src/lib/invite.ts'

test('邀請連結解析', () => {
  assert.equal(inviteFrom(' https://travel.alegu.workers.dev/join/AbC-12_xyZ09 '), 'AbC-12_xyZ09')
  assert.equal(inviteFrom('AbC-12_xyZ09'), 'AbC-12_xyZ09')
  assert.equal(inviteFrom('一起來排行程吧！ https://travel.alegu.workers.dev/join/AbC-12_xyZ09'), 'AbC-12_xyZ09')
  assert.equal(inviteFrom('hello'), undefined)
})
