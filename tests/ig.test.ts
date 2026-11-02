import { test } from 'node:test'
import assert from 'node:assert/strict'
import { igShortcode, parseEmbedHtml, parseGraphql, parseOgTags } from '../shared/ig.ts'

test('取出貼文代碼', () => {
  assert.equal(igShortcode('https://www.instagram.com/reel/C9abc_D-12/?igsh=xyz'), 'C9abc_D-12')
  assert.equal(igShortcode('https://instagram.com/p/C9abcD12/'), 'C9abcD12')
  assert.equal(igShortcode('https://www.instagram.com/someone/reel/C9abcD12/'), 'C9abcD12')
  assert.equal(igShortcode('https://www.instagram.com/share/reel/BAxyz/'), undefined)
  assert.equal(igShortcode('https://example.com/reel/C9abcD12/'), undefined)
})

test('嵌入頁：Caption 區塊與跳脫 JSON', () => {
  const html = `<div class="Caption"><a class="CaptionUsername" href="#">foodie.jp</a><br/>越後湯澤 必吃 &amp; へぎそば<br/>#湯沢<div class="CaptionComments">x</div>
  <script>window.__x = "{\\"location\\":{\\"id\\":\\"1\\",\\"has_public_page\\":true,\\"name\\":\\"\\u4e2d\\u91ce\\u5c4b\\"},\\"video_url\\":\\"https:\\/\\/scontent.cdninstagram.com\\/v.mp4?a=1\\u0026b=2\\"}"</script>`
  const r = parseEmbedHtml(html)
  assert.equal(r.username, 'foodie.jp')
  assert.equal(r.caption, '越後湯澤 必吃 & へぎそば\n#湯沢')
  assert.equal(r.location, '中野屋')
  assert.equal(r.videoUrl, 'https://scontent.cdninstagram.com/v.mp4?a=1&b=2')
})

test('GraphQL 回應', () => {
  const r = parseGraphql({
    data: { xdt_shortcode_media: { edge_media_to_caption: { edges: [{ node: { text: '拉麵' } }] }, location: { name: '越後湯沢駅' }, video_url: 'https://v.mp4', owner: { username: 'a' } } },
  })
  assert.deepEqual(r, { caption: '拉麵', location: '越後湯沢駅', videoUrl: 'https://v.mp4', username: 'a' })
  assert.deepEqual(parseGraphql({ data: { xdt_shortcode_media: null } }), {})
})

test('og:description 取說明文字', () => {
  const html = `<meta property="og:description" content="1,234 likes, 56 comments - foodie.jp on March 1, 2025: &quot;湯澤三間必吃&quot;. ">`
  assert.equal(parseOgTags(html).caption, '湯澤三間必吃')
})
