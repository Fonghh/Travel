import { test } from 'node:test'
import assert from 'node:assert/strict'
import { routeLinks, MAX_WAYPOINTS } from '../src/lib/gmaps.ts'
import { buildKml } from '../src/lib/kml.ts'

const pts = (n: number) => Array.from({ length: n }, (_, i) => ({ lat: 35 + i / 100, lng: 138 + i / 100 }))
const parse = (u: string) => new URL(u).searchParams

test('三個點：起點、中途點、終點', () => {
  const [u] = routeLinks(pts(3))
  const q = parse(u)
  assert.equal(q.get('origin'), '35,138')
  assert.equal(q.get('waypoints'), '35.01,138.01')
  assert.equal(q.get('destination'), '35.02,138.02')
})

test('從目前位置出發：沒有 origin', () => {
  const [u] = routeLinks(pts(2), { fromCurrent: true })
  assert.equal(parse(u).get('origin'), null)
  assert.equal(parse(u).get('waypoints'), '35,138')
})

test('只有一個點：直接導航過去', () => {
  const links = routeLinks(pts(1))
  assert.equal(links.length, 1)
  assert.equal(parse(links[0]).get('destination'), '35,138')
  assert.equal(parse(links[0]).get('origin'), null)
})

test('點太多會分段，每段終點是下一段起點，所有點都有涵蓋', () => {
  const p = pts(25)
  const links = routeLinks(p)
  assert.ok(links.length > 1)
  const seen = new Set<string>()
  let prevDest: string | null = null
  for (const u of links) {
    const q = parse(u)
    if (prevDest) assert.equal(q.get('origin'), prevDest)
    const mids = q.get('waypoints')?.split('|') ?? []
    assert.ok(mids.length <= MAX_WAYPOINTS)
    ;[q.get('origin'), ...mids, q.get('destination')].forEach((x) => x && seen.add(x))
    prevDest = q.get('destination')
  }
  assert.equal(seen.size, 25)
})

test('KML：跳脫特殊字元、資料夾、路線顏色', () => {
  const k = buildKml('湯澤 & 東京', [
    { name: '3/5（五）', places: [{ name: '<滑雪>', lat: 36.98, lng: 138.82, style: 'must' }, { name: '溫泉', lat: 36.94, lng: 138.81 }], route: { name: '小明的路線', color: '#F2A497' } },
    { name: '空的', places: [] },
  ])
  assert.ok(k.includes('<name>湯澤 &amp; 東京</name>'))
  assert.ok(k.includes('<name>&lt;滑雪&gt;</name>'))
  assert.ok(k.includes('<coordinates>138.82,36.98,0</coordinates>'))
  assert.ok(k.includes('<color>ff97a4f2</color>'))
  assert.ok(!k.includes('空的'))
})
