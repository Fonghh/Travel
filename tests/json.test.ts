import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseJsonBlock } from '../shared/json.ts'

test('從模型回覆挖 JSON', () => {
  assert.deepEqual(parseJsonBlock('好的，以下是結果：\n```json\n{"found": true, "places": [{"name": "大室山"}]}\n```'), { found: true, places: [{ name: '大室山' }] })
  assert.deepEqual(parseJsonBlock('結果 {"found": false, "caption": null} 以上'), { found: false, caption: null })
  assert.equal(parseJsonBlock('找不到這篇貼文'), null)
  assert.equal(parseJsonBlock('[1,2]'), null)
})
