import { test } from 'node:test'
import assert from 'node:assert/strict'
import { extractPlaces, findCoords, searchQueries } from '../shared/extract.ts'

// 使用者實際截圖的那支富士山 Reels
const FUJI = `⛰️📍
1・富士吉田懷舊商店街 富士吉田 レトロ商店街

2・產屋崎神社 産屋ヶ崎神社

3・富士山駅

4・新倉富士浅間神社

5・北35.51261° 東138.76903°

7・富士急行線

9・(35.4990600, 138.7651600)

10・Shichirigahama 七里ヶ浜

12・河口湖駅`

test('富士山 Reels：編號清單全部拆出來，座標直接解析', () => {
  const { places } = extractPlaces(FUJI)
  assert.deepEqual(places.map((p) => p.name), [
    '富士吉田懷舊商店街 富士吉田 レトロ商店街',
    '產屋崎神社 産屋ヶ崎神社',
    '富士山駅',
    '新倉富士浅間神社',
    '座標 1',
    '富士急行線',
    '座標 2',
    'Shichirigahama 七里ヶ浜',
    '河口湖駅',
  ])
  assert.deepEqual([places[4].lat, places[4].lng], [35.51261, 138.76903])
  assert.deepEqual([places[6].lat, places[6].lng], [35.49906, 138.76516])
  assert.equal(places[1].queries[0], '産屋ヶ崎神社')
  assert.equal(places[0].queries[0], '富士吉田 レトロ商店街')
  assert.equal(places[7].queries[0], '七里ヶ浜')
})

test('各種座標格式', () => {
  assert.deepEqual(findCoords('35°30\'45.4"N 138°46\'08.5"E'), { lat: 35.512611, lng: 138.769028, match: '35°30\'45.4"N 138°46\'08.5"E' })
  assert.equal(findCoords('N35.5 E138.7')?.lat, 35.5)
  assert.equal(findCoords('35.51°N, 138.76°E')?.lng, 138.76)
  assert.equal(findCoords('價格 3.5, 2.0'), null)
  assert.equal(findCoords('營業 10:00-18:00'), null)
})

test('沒有編號：取看起來像地名的短行，略過句子、hashtag、網址', () => {
  const { places, urls } = extractPlaces(`湯澤必去三間！
へぎそば 中野屋
🍶 ぽんしゅ館
#湯沢 #スキー
今天真的玩得超開心，推薦給大家。
https://www.instagram.com/reel/C9abcD12/`)
  assert.deepEqual(places.map((p) => p.name), ['へぎそば 中野屋', 'ぽんしゅ館'])
  assert.deepEqual(urls, ['https://www.instagram.com/reel/C9abcD12/'])
})

test('名稱查詢順序：單一名稱就是自己', () => {
  assert.deepEqual(searchQueries('河口湖駅'), ['河口湖駅'])
})

// 使用者實測：「地區｜名稱」格式，📍 被辨識成「甲」「丫」
const AREA_LIST = `甲富士市｜大淵笹場 Obuchi Sasaba
甲伊豆｜大室山 Mt.Omuro
丫三島｜三島 SKY WALK
富士宮市｜Cafe SHIZEN
11E15 | Forest Adventure`

test('地區｜名稱：拆出地區、去掉誤認的 📍、組合查詢', () => {
  const { places } = extractPlaces(AREA_LIST)
  assert.deepEqual(places.map((p) => [p.name, p.area]), [
    ['大淵笹場 Obuchi Sasaba', '富士市'],
    ['大室山 Mt.Omuro', '伊豆'],
    ['三島 SKY WALK', '三島'],
    ['Cafe SHIZEN', '富士宮市'],
    ['Forest Adventure', undefined],
  ])
  assert.deepEqual(places[0].queries.slice(0, 3), ['大淵笹場 富士市', '大淵笹場 Obuchi Sasaba 富士市', 'Obuchi Sasaba 富士市'])
  assert.deepEqual(places[1].queries.slice(0, 2), ['大室山 伊豆', '大室山 Mt.Omuro 伊豆'])
  assert.equal(places[2].queries[0], '三島 SKY WALK 三島')
  assert.equal(places[3].queries[0], 'Cafe SHIZEN 富士宮市')
  assert.equal(places[4].queries[0], 'Forest Adventure')
})
