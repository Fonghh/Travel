import type { ExpenseCategory, Transport } from '../shared/types.ts'

export const MEMBER_COLORS = [
  { id: 'coral', hex: '#F2A497', name: '珊瑚粉' },
  { id: 'yamabuki', hex: '#F6D27A', name: '山吹黃' },
  { id: 'mizu', hex: '#A8D3E6', name: '水色' },
  { id: 'wakatake', hex: '#B9DAA5', name: '若竹綠' },
  { id: 'sakura', hex: '#F7C5CC', name: '櫻色' },
  { id: 'fuji', hex: '#CDBFE6', name: '藤色' },
  { id: 'kaki', hex: '#F4BE8C', name: '柿色' },
  { id: 'sora', hex: '#C9E4F0', name: '空色' },
]
export const colorHex = (id: string) => MEMBER_COLORS.find((c) => c.id === id)?.hex ?? '#F6D27A'

export interface ThemeInfo {
  id: string
  name: string
  hint: string
  search: 'ja' | 'ko' | 'zh' | 'en'
}
export const THEMES: ThemeInfo[] = [
  { id: 'snow', name: '雪國', hint: '滑雪場、溫泉、新幹線', search: 'ja' },
  { id: 'tokyo', name: '東京', hint: '東京鐵塔、電車', search: 'ja' },
  { id: 'kyoto', name: '京都', hint: '鳥居、五重塔', search: 'ja' },
  { id: 'osaka', name: '大阪', hint: '大阪城、章魚燒', search: 'ja' },
  { id: 'okinawa', name: '沖繩', hint: '海、紅瓦屋、風獅爺', search: 'ja' },
  { id: 'seoul', name: '首爾', hint: '南山塔、韓屋', search: 'ko' },
  { id: 'taiwan', name: '台灣', hint: '101、火車', search: 'zh' },
  { id: 'generic', name: '其他地方', hint: '飛機、行李箱', search: 'en' },
]
export const themeInfo = (id: string) => THEMES.find((t) => t.id === id) ?? THEMES[THEMES.length - 1]

export const TRANSPORTS: { id: Transport; label: string; icon: string; color: string }[] = [
  { id: 'walk', label: '步行', icon: '🚶', color: '#B9DAA5' },
  { id: 'train', label: '電車', icon: '🚃', color: '#A8D3E6' },
  { id: 'shinkansen', label: '新幹線', icon: '🚄', color: '#A8D3E6' },
  { id: 'bus', label: '巴士', icon: '🚌', color: '#F6D27A' },
  { id: 'taxi', label: '計程車', icon: '🚕', color: '#F6D27A' },
  { id: 'car', label: '開車', icon: '🚗', color: '#F6D27A' },
  { id: 'plane', label: '飛機', icon: '✈️', color: '#F2A497' },
  { id: 'ship', label: '船', icon: '⛴️', color: '#A8D3E6' },
  { id: 'ropeway', label: '纜車', icon: '🚡', color: '#B9DAA5' },
  { id: 'ski', label: '滑雪', icon: '⛷️', color: '#C9E4F0' },
  { id: 'none', label: '不用移動', icon: '📍', color: '#EFE8DA' },
]
export const transportInfo = (id: string) => TRANSPORTS.find((t) => t.id === id) ?? TRANSPORTS[TRANSPORTS.length - 1]

export const CATEGORIES: { id: ExpenseCategory; label: string; icon: string }[] = [
  { id: 'food', label: '吃喝', icon: '🍜' },
  { id: 'transport', label: '交通', icon: '🚄' },
  { id: 'stay', label: '住宿', icon: '🏨' },
  { id: 'ski', label: '雪具／纜車', icon: '🎿' },
  { id: 'other', label: '其他', icon: '🛍️' },
]

export const CURRENCIES = ['TWD', 'JPY', 'KRW', 'USD', 'EUR', 'HKD', 'THB', 'CNY', 'SGD']
export const CURRENCY_SIGN: Record<string, string> = { TWD: 'NT$', JPY: '¥', KRW: '₩', USD: 'US$', EUR: '€', HKD: 'HK$', THB: '฿', CNY: 'CN¥', SGD: 'S$' }

export const MOODS = ['😋', '🤩', '🥰', '😴', '🥶', '⛷️', '♨️', '📸']

// 常用機場 → 時區
export const AIRPORTS: Record<string, { name: string; tz: string }> = {
  TPE: { name: '桃園', tz: 'Asia/Taipei' },
  TSA: { name: '松山', tz: 'Asia/Taipei' },
  KHH: { name: '高雄', tz: 'Asia/Taipei' },
  RMQ: { name: '台中', tz: 'Asia/Taipei' },
  NRT: { name: '成田', tz: 'Asia/Tokyo' },
  HND: { name: '羽田', tz: 'Asia/Tokyo' },
  KIJ: { name: '新潟', tz: 'Asia/Tokyo' },
  KIX: { name: '關西', tz: 'Asia/Tokyo' },
  NGO: { name: '中部', tz: 'Asia/Tokyo' },
  CTS: { name: '新千歲', tz: 'Asia/Tokyo' },
  FUK: { name: '福岡', tz: 'Asia/Tokyo' },
  OKA: { name: '那霸', tz: 'Asia/Tokyo' },
  SDJ: { name: '仙台', tz: 'Asia/Tokyo' },
  KMQ: { name: '小松', tz: 'Asia/Tokyo' },
  TOY: { name: '富山', tz: 'Asia/Tokyo' },
  HKD: { name: '函館', tz: 'Asia/Tokyo' },
  ICN: { name: '仁川', tz: 'Asia/Seoul' },
  GMP: { name: '金浦', tz: 'Asia/Seoul' },
  PUS: { name: '釜山', tz: 'Asia/Seoul' },
  HKG: { name: '香港', tz: 'Asia/Hong_Kong' },
  BKK: { name: '曼谷', tz: 'Asia/Bangkok' },
  SIN: { name: '新加坡', tz: 'Asia/Singapore' },
}
export const TIMEZONES = [
  ['Asia/Taipei', '台灣 (UTC+8)'],
  ['Asia/Tokyo', '日本 (UTC+9)'],
  ['Asia/Seoul', '韓國 (UTC+9)'],
  ['Asia/Hong_Kong', '香港 (UTC+8)'],
  ['Asia/Bangkok', '泰國 (UTC+7)'],
  ['Asia/Singapore', '新加坡 (UTC+8)'],
  ['Europe/London', '英國'],
  ['Europe/Paris', '中歐'],
  ['America/Los_Angeles', '美西'],
  ['America/New_York', '美東'],
  ['Australia/Sydney', '雪梨'],
] as const

// 吃喝玩樂：依目的地語言決定搜尋關鍵字
export const RECOMMEND: { id: string; label: string; icon: string; color: string; subs: { label: string; q: Record<'ja' | 'ko' | 'zh' | 'en', string> }[] }[] = [
  { id: 'eat', label: '吃', icon: '🍜', color: '#F2A497', subs: [
    { label: '餐廳', q: { ja: 'レストラン', ko: '맛집', zh: '餐廳', en: 'restaurants' } },
    { label: '拉麵', q: { ja: 'ラーメン', ko: '라멘', zh: '拉麵', en: 'ramen' } },
    { label: '甜點', q: { ja: 'スイーツ', ko: '디저트', zh: '甜點', en: 'dessert' } },
    { label: '在地小吃', q: { ja: '郷土料理', ko: '전통 음식', zh: '小吃', en: 'local food' } },
  ] },
  { id: 'drink', label: '喝', icon: '☕', color: '#F6D27A', subs: [
    { label: '咖啡', q: { ja: 'カフェ', ko: '카페', zh: '咖啡廳', en: 'cafe' } },
    { label: '居酒屋', q: { ja: '居酒屋', ko: '술집', zh: '居酒屋', en: 'izakaya' } },
    { label: '酒吧', q: { ja: 'バー', ko: '바', zh: '酒吧', en: 'bar' } },
    { label: '酒藏／酒廠', q: { ja: '酒蔵', ko: '양조장', zh: '酒廠', en: 'brewery' } },
  ] },
  { id: 'play', label: '玩', icon: '🎡', color: '#A8D3E6', subs: [
    { label: '景點', q: { ja: '観光スポット', ko: '관광지', zh: '景點', en: 'attractions' } },
    { label: '公園／自然', q: { ja: '公園', ko: '공원', zh: '公園', en: 'park' } },
    { label: '博物館', q: { ja: '博物館', ko: '박물관', zh: '博物館', en: 'museum' } },
    { label: '溫泉', q: { ja: '日帰り温泉', ko: '온천', zh: '溫泉', en: 'hot spring' } },
  ] },
  { id: 'fun', label: '樂', icon: '🛍️', color: '#B9DAA5', subs: [
    { label: '購物', q: { ja: 'ショッピング', ko: '쇼핑', zh: '購物', en: 'shopping' } },
    { label: '藥妝', q: { ja: 'ドラッグストア', ko: '올리브영', zh: '藥妝', en: 'drugstore' } },
    { label: '伴手禮', q: { ja: 'お土産', ko: '기념품', zh: '伴手禮', en: 'souvenir' } },
    { label: '便利商店', q: { ja: 'コンビニ', ko: '편의점', zh: '便利商店', en: 'convenience store' } },
  ] },
]
