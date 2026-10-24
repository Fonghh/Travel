import { test } from 'node:test'
import assert from 'node:assert/strict'
import { nearbyLink } from '../src/trip/helpers.ts'
import { RECOMMEND } from '../src/data.ts'

const cafe = RECOMMEND[1].subs[0]

test('有座標：以座標為中心搜尋，不帶地點名稱', () => {
  const u = nearbyLink('snow', cafe, { lat: 36.9245, lng: 138.8078, title: 'NASPA New Otani' })
  assert.equal(u, 'https://www.google.com/maps/search/%E3%82%AB%E3%83%95%E3%82%A7/@36.9245,138.8078,16z')
})

test('沒座標：用 near，不會直接搜到飯店本身', () => {
  const u = decodeURIComponent(nearbyLink('snow', cafe, { title: 'NASPA New Otani' }))
  assert.ok(u.endsWith('query=カフェ near NASPA New Otani'), u)
})
