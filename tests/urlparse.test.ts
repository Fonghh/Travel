import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseGoogleMapsUrl, extractTitle, isShortMapsUrl } from '../shared/urlparse.ts'

test('place 網址：名稱＋!3d!4d 座標優先', () => {
  const r = parseGoogleMapsUrl('https://www.google.com/maps/place/%E7%9F%B3%E6%89%93%E4%B8%B8%E6%BB%91%E9%9B%AA%E5%A0%B4/@36.9711,138.8099,15z/data=!4m6!3m5!1s0x0:0x0!8m2!3d36.9734!4d138.8123!16s')
  assert.deepEqual(r, { lat: 36.9734, lng: 138.8123, name: '石打丸滑雪場' })
})

test('place 網址 + 號轉空白', () => {
  const r = parseGoogleMapsUrl('https://www.google.com.tw/maps/place/Tsukiji+Outer+Market/@35.665,139.770,17z')
  assert.equal(r?.name, 'Tsukiji Outer Market')
  assert.equal(r?.lat, 35.665)
})

test('?q= 座標', () => {
  assert.deepEqual(parseGoogleMapsUrl('https://maps.google.com/?q=36.93,138.80'), { lat: 36.93, lng: 138.8 })
})

test('?q= 名稱', () => {
  assert.deepEqual(parseGoogleMapsUrl('https://www.google.com/maps/search/?api=1&query=越後湯澤站'), { name: '越後湯澤站' })
})

test('非 Google 網址回傳 null', () => {
  assert.equal(parseGoogleMapsUrl('https://tabelog.com/niigata/A1505/'), null)
  assert.equal(parseGoogleMapsUrl('not a url'), null)
})

test('短網址判斷', () => {
  assert.ok(isShortMapsUrl(new URL('https://maps.app.goo.gl/AbCd123')))
  assert.ok(!isShortMapsUrl(new URL('https://goo.gl/xyz')))
})

test('網頁標題', () => {
  assert.equal(extractTitle('<html><head><title> 湯澤 &amp; 溫泉 </title></head>'), '湯澤 & 溫泉')
  assert.equal(extractTitle('<meta property="og:title" content="へぎそば 小嶋屋">'), 'へぎそば 小嶋屋')
})
