// Instagram 貼文／Reels 解析（實驗用）：只從公開頁面取說明文字、標註地點、影片網址

export interface IgInfo {
  caption?: string
  location?: string
  videoUrl?: string
  username?: string
}

/** 從網址取出貼文代碼（/p/、/reel/、/reels/、/tv/） */
export function igShortcode(raw: string): string | undefined {
  try {
    const u = new URL(raw.trim())
    if (!/(^|\.)instagram\.com$/.test(u.hostname) || u.pathname.startsWith('/share/')) return undefined
    return /^\/(?:[\w.]+\/)?(?:p|reels?|tv)\/([\w-]{5,})/.exec(u.pathname)?.[1]
  } catch {
    return undefined
  }
}

export function isInstagramUrl(raw: string): boolean {
  try {
    return /(^|\.)instagram\.com$/.test(new URL(raw.trim()).hostname)
  } catch {
    return false
  }
}

function unescapeJson(s: string): string {
  try {
    return JSON.parse(`"${s}"`)
  } catch {
    return s.replace(/\\\//g, '/').replace(/\\"/g, '"')
  }
}

function decodeEntities(s: string): string {
  return s
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
}

/** 嵌入頁（/embed/captioned/）：HTML 裡的 Caption 區塊，加上可能內嵌（可能被跳脫）的 JSON */
export function parseEmbedHtml(html: string): IgInfo {
  const out: IgInfo = {}
  // 先把一層 JSON 跳脫拿掉，讓同一組正規式能對到
  const flat = html.replace(/\\\\\\"/g, '"').replace(/\\"/g, '"').replace(/\\\//g, '/')

  const cap = /<div class="Caption">([\s\S]*?)<div class="CaptionComments">/.exec(html)
  if (cap) {
    const body = cap[1].replace(/<a class="CaptionUsername"[\s\S]*?<\/a>/, '')
    out.caption = decodeEntities(body).trim() || undefined
  }
  if (!out.caption) {
    const t = /"edge_media_to_caption":\{"edges":\[\{"node":\{"text":"((?:[^"\\]|\\.)*)"/.exec(flat)
    if (t) out.caption = unescapeJson(t[1])
  }
  const user = /<a class="CaptionUsername"[^>]*>([^<]+)<\/a>/.exec(html) || /"owner":\{[^}]*"username":"([\w.]+)"/.exec(flat)
  if (user) out.username = user[1]
  const loc = /"location":\{[^}]*?"name":"((?:[^"\\]|\\.)*)"/.exec(flat)
  if (loc) out.location = unescapeJson(loc[1])
  const vid = /"video_url":"((?:[^"\\]|\\.)*)"/.exec(flat)
  if (vid) out.videoUrl = unescapeJson(vid[1]).replace(/\\u0026/g, '&')
  return out
}

/** 網頁版 GraphQL 回應（xdt_shortcode_media / shortcode_media） */
export function parseGraphql(json: unknown): IgInfo {
  const d = (json as { data?: Record<string, any> })?.data
  const m = d?.xdt_shortcode_media ?? d?.shortcode_media
  if (!m) return {}
  return {
    caption: m.edge_media_to_caption?.edges?.[0]?.node?.text || undefined,
    location: m.location?.name || undefined,
    videoUrl: m.video_url || undefined,
    username: m.owner?.username || undefined,
  }
}

/** 一般貼文頁的預覽資訊（og:description 通常是「讚數、留言 - 帳號 日期: "說明文字"」） */
export function parseOgTags(html: string): IgInfo {
  const meta = (prop: string) =>
    (new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']*)["']`, 'i').exec(html) ||
      new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${prop}["']`, 'i').exec(html))?.[1]
  const desc = meta('og:description')
  const video = meta('og:video') || meta('og:video:secure_url')
  const out: IgInfo = {}
  if (desc) {
    const d = decodeEntities(desc)
    const q = /:\s*["“]([\s\S]+)["”]\s*\.?\s*$/.exec(d)
    out.caption = (q ? q[1] : d).trim()
  }
  if (video) out.videoUrl = decodeEntities(video)
  return out
}
