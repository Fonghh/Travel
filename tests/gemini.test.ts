import { test } from 'node:test'
import assert from 'node:assert/strict'
import { classifyGeminiError, geminiModels, tryNextModel, DEFAULT_GEMINI_MODELS } from '../shared/gemini.ts'

test('免費額度為 0：換下一個模型', () => {
  const msg = 'You exceeded your current quota. Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 0, model: gemini-3-flash'
  assert.equal(classifyGeminiError(429, msg), 'no-quota')
  assert.ok(tryNextModel('no-quota'))
})

test('模型不存在或不支援：換下一個', () => {
  assert.equal(classifyGeminiError(404, 'models/gemini-2.5-flash is not found for API version v1beta'), 'unavailable')
  assert.equal(classifyGeminiError(400, 'Search Grounding is not supported.'), 'unavailable')
})

test('限流：額度每個模型分開算，也換下一個；金鑰錯誤才停', () => {
  assert.equal(classifyGeminiError(429, 'Quota exceeded for metric: ...requests_per_model_per_day, limit: 20'), 'daily')
  assert.equal(classifyGeminiError(429, 'Resource has been exhausted (e.g. check quota).'), 'rate')
  assert.ok(tryNextModel('rate') && tryNextModel('daily'))
  assert.equal(classifyGeminiError(400, 'API key not valid. Please pass a valid API key.'), 'other')
  assert.ok(!tryNextModel('other'))
})

test('模型設定：可用逗號指定多個', () => {
  assert.deepEqual(geminiModels(), DEFAULT_GEMINI_MODELS)
  assert.deepEqual(geminiModels(' gemini-3-flash-preview , gemini-2.5-flash '), ['gemini-3-flash-preview', 'gemini-2.5-flash'])
})
