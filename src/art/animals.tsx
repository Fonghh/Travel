// 30 隻繪本風動物頭像（viewBox 64x64，平塗＋墨線）
import type { ReactNode } from 'react'

const INK = '#3E3A39'
const SW = 2.6
const P = { fill: 'none', stroke: INK, strokeWidth: SW, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
const S = (fill: string) => ({ fill, stroke: INK, strokeWidth: SW, strokeLinejoin: 'round' as const })

type Ears = 'pointy' | 'round' | 'small' | 'long' | 'koala' | 'big' | 'tall' | 'none' | 'tufts' | 'droopy'

interface Spec {
  id: string
  name: string
  origin: string
  head: string
  ears: Ears
  ear?: string
  inner?: string
  muzzle?: string
  nose?: string
  headShape?: 'round' | 'wide' | 'tall' | 'box'
  behind?: ReactNode // 畫在頭後面
  front?: ReactNode // 畫在頭上面（臉部之前）
  face?: ReactNode // 取代預設五官
  noBlush?: boolean
}

function EarsSvg({ type, c, inner }: { type: Ears; c: string; inner?: string }) {
  switch (type) {
    case 'pointy':
      return (
        <g>
          <path d="M13 30 L15 8 L29 19 Z" {...S(c)} />
          <path d="M51 30 L49 8 L35 19 Z" {...S(c)} />
          {inner && <path d="M17 24 L18 14 L25 19 Z" fill={inner} />}
          {inner && <path d="M47 24 L46 14 L39 19 Z" fill={inner} />}
        </g>
      )
    case 'tall':
      return (
        <g>
          <path d="M18 26 Q12 6 20 4 Q27 8 27 22 Z" {...S(c)} />
          <path d="M46 26 Q52 6 44 4 Q37 8 37 22 Z" {...S(c)} />
          {inner && <path d="M20 20 Q17 10 20 8 Q24 11 24 20 Z" fill={inner} />}
          {inner && <path d="M44 20 Q47 10 44 8 Q40 11 40 20 Z" fill={inner} />}
        </g>
      )
    case 'round':
      return (
        <g>
          <circle cx="15" cy="20" r="7.5" {...S(c)} />
          <circle cx="49" cy="20" r="7.5" {...S(c)} />
          {inner && <circle cx="15.5" cy="20.5" r="3.6" fill={inner} />}
          {inner && <circle cx="48.5" cy="20.5" r="3.6" fill={inner} />}
        </g>
      )
    case 'small':
      return (
        <g>
          <circle cx="17" cy="22" r="5" {...S(c)} />
          <circle cx="47" cy="22" r="5" {...S(c)} />
        </g>
      )
    case 'long':
      return (
        <g>
          <ellipse cx="24" cy="12" rx="5.5" ry="13" {...S(c)} />
          <ellipse cx="40" cy="12" rx="5.5" ry="13" {...S(c)} />
          {inner && <ellipse cx="24" cy="13" rx="2.4" ry="9" fill={inner} />}
          {inner && <ellipse cx="40" cy="13" rx="2.4" ry="9" fill={inner} />}
        </g>
      )
    case 'koala':
      return (
        <g>
          <circle cx="12" cy="25" r="10.5" {...S(c)} />
          <circle cx="52" cy="25" r="10.5" {...S(c)} />
          {inner && <circle cx="13" cy="26" r="5.5" fill={inner} />}
          {inner && <circle cx="51" cy="26" r="5.5" fill={inner} />}
        </g>
      )
    case 'big':
      return (
        <g>
          <ellipse cx="11" cy="36" rx="10" ry="14" {...S(c)} />
          <ellipse cx="53" cy="36" rx="10" ry="14" {...S(c)} />
          {inner && <ellipse cx="12" cy="37" rx="5" ry="8" fill={inner} />}
          {inner && <ellipse cx="52" cy="37" rx="5" ry="8" fill={inner} />}
        </g>
      )
    case 'tufts':
      return (
        <g>
          <path d="M16 26 L13 10 L26 19 Z" {...S(c)} />
          <path d="M48 26 L51 10 L38 19 Z" {...S(c)} />
        </g>
      )
    case 'droopy':
      return (
        <g>
          <path d="M16 22 Q6 26 10 38 Q16 36 19 28 Z" {...S(c)} />
          <path d="M48 22 Q58 26 54 38 Q48 36 45 28 Z" {...S(c)} />
        </g>
      )
    default:
      return null
  }
}

function Head({ shape = 'round', c }: { shape?: Spec['headShape']; c: string }) {
  if (shape === 'wide') return <ellipse cx="32" cy="37" rx="22" ry="17" {...S(c)} />
  if (shape === 'tall') return <ellipse cx="32" cy="35" rx="17" ry="20" {...S(c)} />
  if (shape === 'box') return <rect x="12" y="20" width="40" height="34" rx="14" {...S(c)} />
  return <ellipse cx="32" cy="36" rx="20" ry="18.5" {...S(c)} />
}

const Eyes = ({ y = 34, dx = 7.5 }: { y?: number; dx?: number }) => (
  <g fill={INK}>
    <circle cx={32 - dx} cy={y} r="2.5" />
    <circle cx={32 + dx} cy={y} r="2.5" />
    <circle cx={32 - dx + 0.8} cy={y - 0.9} r="0.8" fill="#fff" />
    <circle cx={32 + dx + 0.8} cy={y - 0.9} r="0.8" fill="#fff" />
  </g>
)
const Blush = ({ y = 40 }: { y?: number }) => (
  <g fill="#F2A497" opacity="0.75">
    <ellipse cx="19.5" cy={y} rx="3.4" ry="2.3" />
    <ellipse cx="44.5" cy={y} rx="3.4" ry="2.3" />
  </g>
)
const Mouth = ({ y = 42 }: { y?: number }) => <path d={`M28.5 ${y} Q30.5 ${y + 2.6} 32 ${y} Q33.5 ${y + 2.6} 35.5 ${y}`} {...P} strokeWidth={2} />
const Nose = ({ y = 39, c = INK }: { y?: number; c?: string }) => <ellipse cx="32" cy={y} rx="2.6" ry="1.9" fill={c} />

const W = '#FFFFFF'
const CREAM = '#FFF4E2'
const BROWN = '#C89B72'
const DARK = '#6B5E58'
const ORANGE = '#F2A86B'
const GREY = '#D9D4CE'
const PINK = '#F7B7C3'

export const ANIMALS: Spec[] = [
  { id: 'rabbit', name: '雪兔', origin: '日本', head: W, ears: 'long', ear: W, inner: PINK, nose: '#F2A497' },
  { id: 'fox', name: '狐狸', origin: '日本', head: ORANGE, ears: 'pointy', ear: ORANGE, inner: CREAM, muzzle: W,
    front: <path d="M14 38 Q22 52 32 54 Q42 52 50 38 Q42 44 32 44 Q22 44 14 38 Z" fill={W} /> },
  { id: 'tanuki', name: '狸貓', origin: '日本', head: BROWN, ears: 'small', ear: DARK,
    front: <g fill={DARK}><ellipse cx="24" cy="35" rx="6.5" ry="5" /><ellipse cx="40" cy="35" rx="6.5" ry="5" /><ellipse cx="32" cy="44" rx="7" ry="5" fill={CREAM} /></g> },
  { id: 'shiba', name: '柴犬', origin: '日本', head: '#E9A56B', ears: 'pointy', ear: '#E9A56B', inner: CREAM,
    front: <g fill={W}><path d="M14 40 Q20 54 32 54 Q44 54 50 40 Q44 46 32 45 Q20 46 14 40 Z" /><ellipse cx="25" cy="29" rx="2.4" ry="1.4" /><ellipse cx="39" cy="29" rx="2.4" ry="1.4" /></g> },
  { id: 'calico', name: '三花貓', origin: '日本', head: W, ears: 'pointy', ear: W, inner: PINK,
    front: <g><path d="M13 32 Q14 20 25 18 Q24 28 18 34 Z" fill={ORANGE} /><path d="M51 30 Q50 20 40 18 Q42 26 47 32 Z" fill={DARK} /></g>,
    nose: '#F2A497' },
  { id: 'monkey', name: '雪猴', origin: '日本・地獄谷', head: GREY, ears: 'small', ear: '#F2A497',
    front: <path d="M20 32 Q20 24 28 26 Q32 28 36 26 Q44 24 44 32 Q46 46 32 48 Q18 46 20 32 Z" fill="#F4A9A0" stroke={INK} strokeWidth={2} />, noBlush: true },
  { id: 'penguin', name: '企鵝', origin: '南極', head: DARK, ears: 'none',
    front: <path d="M17 38 Q17 25 26 26 Q32 30 38 26 Q47 25 47 38 Q47 52 32 52 Q17 52 17 38 Z" fill={W} />,
    face: <><Eyes y={36} dx={6.5} /><path d="M28.5 41 L32 46 L35.5 41 Z" {...S('#F6D27A')} strokeWidth={2} /><Blush y={43} /></> },
  { id: 'brownbear', name: '棕熊', origin: '日本・北海道', head: '#B07D57', ears: 'round', ear: '#B07D57', inner: '#D9B08C', muzzle: '#E3C4A3' },
  { id: 'squirrel', name: '松鼠', origin: '日本', head: '#D4935F', ears: 'tufts', ear: '#D4935F', muzzle: CREAM,
    behind: <path d="M48 56 Q64 50 58 30 Q54 18 60 10 Q46 12 46 28 Q46 40 40 50 Z" {...S('#E2A673')} /> },
  { id: 'owl', name: '貓頭鷹', origin: '日本', head: '#B9A089', ears: 'tufts', ear: '#B9A089',
    face: <><circle cx="24" cy="35" r="7" {...S(CREAM)} strokeWidth={2} /><circle cx="40" cy="35" r="7" {...S(CREAM)} strokeWidth={2} /><circle cx="24" cy="35" r="3" fill={INK} /><circle cx="40" cy="35" r="3" fill={INK} /><path d="M29.5 41 L32 46 L34.5 41 Z" {...S('#F6D27A')} strokeWidth={1.8} /></>, noBlush: true },
  { id: 'deer', name: '奈良鹿', origin: '日本・奈良', head: '#D7A475', ears: 'droopy', ear: '#D7A475', muzzle: CREAM,
    behind: <g {...P}><path d="M22 20 L18 6 M19 12 L13 10 M42 20 L46 6 M45 12 L51 10" strokeWidth={3} /></g>,
    front: <g fill={CREAM}><circle cx="20" cy="28" r="1.6" /><circle cx="44" cy="28" r="1.6" /></g> },
  { id: 'capybara', name: '水豚', origin: '南美', head: '#B89071', ears: 'small', ear: '#9C775B', headShape: 'box',
    face: <><g fill={INK}><circle cx="23" cy="32" r="2.2" /><circle cx="41" cy="32" r="2.2" /></g><rect x="22" y="38" width="20" height="12" rx="6" fill="#A37E62" /><g fill={INK}><ellipse cx="28" cy="42" rx="1.4" ry="2" /><ellipse cx="36" cy="42" rx="1.4" ry="2" /></g><Blush y={37} /></>,
    behind: <g><rect x="22" y="4" width="20" height="9" rx="4.5" {...S('#F6D27A')} strokeWidth={2} /><circle cx="27" cy="7" r="1.5" fill="#F2A497" /></g> },
  { id: 'koala', name: '無尾熊', origin: '澳洲', head: GREY, ears: 'koala', ear: GREY, inner: W,
    face: <><Eyes y={34} dx={8} /><ellipse cx="32" cy="40" rx="4.5" ry="5.5" fill={INK} /><Blush y={42} /></> },
  { id: 'kangaroo', name: '袋鼠', origin: '澳洲', head: '#D49A6A', ears: 'tall', ear: '#D49A6A', inner: '#F2C6A0', muzzle: '#F2D3B5', headShape: 'tall' },
  { id: 'panda', name: '大熊貓', origin: '中國', head: W, ears: 'round', ear: INK,
    front: <g fill={INK}><ellipse cx="24" cy="35" rx="5" ry="6.5" transform="rotate(-25 24 35)" /><ellipse cx="40" cy="35" rx="5" ry="6.5" transform="rotate(25 40 35)" /></g>,
    face: <><g fill="#fff"><circle cx="24.5" cy="34" r="1.8" /><circle cx="39.5" cy="34" r="1.8" /></g><Nose y={41} /><Mouth y={44} /><Blush y={43} /></> },
  { id: 'redpanda', name: '小熊貓', origin: '尼泊爾', head: '#D9784E', ears: 'pointy', ear: '#D9784E', inner: W,
    front: <g fill={W}><ellipse cx="22" cy="28" rx="4" ry="2.6" /><ellipse cx="42" cy="28" rx="4" ry="2.6" /><path d="M20 42 Q26 36 32 40 Q38 36 44 42 Q40 52 32 52 Q24 52 20 42 Z" /></g> },
  { id: 'alpaca', name: '羊駝', origin: '秘魯', head: CREAM, ears: 'tall', ear: CREAM, inner: PINK, headShape: 'tall',
    behind: <g {...S(W)}><circle cx="24" cy="18" r="6" /><circle cx="32" cy="15" r="7" /><circle cx="40" cy="18" r="6" /></g>,
    face: <><Eyes y={34} dx={7} /><ellipse cx="32" cy="44" rx="7" ry="5" fill={W} /><path d="M30 42 Q32 44 34 42 M32 43 V46" {...P} strokeWidth={1.8} /><Blush y={40} /></> },
  { id: 'sloth', name: '樹懶', origin: '哥斯大黎加', head: '#C9B49A', ears: 'none',
    front: <g><ellipse cx="32" cy="38" rx="15" ry="11" fill={CREAM} /><path d="M18 33 Q23 30 28 36" stroke={DARK} strokeWidth="5" strokeLinecap="round" fill="none" /><path d="M46 33 Q41 30 36 36" stroke={DARK} strokeWidth="5" strokeLinecap="round" fill="none" /></g>,
    face: <><g fill={INK}><circle cx="24.5" cy="34" r="1.6" /><circle cx="39.5" cy="34" r="1.6" /></g><Nose y={39} /><path d="M27 43 Q32 47 37 43" {...P} strokeWidth={2} /><Blush y={41} /></> },
  { id: 'otter', name: '海獺', origin: '加拿大', head: '#A98467', ears: 'small', ear: '#A98467',
    front: <path d="M16 34 Q18 24 32 24 Q46 24 48 34 Q44 30 32 30 Q20 30 16 34 Z" fill="#E8D8C4" />, muzzle: '#E8D8C4',
    face: <><Eyes y={35} /><Nose y={40} /><Mouth y={43} /><g {...P} strokeWidth={1.5}><path d="M22 42 L14 41 M22 44 L15 46 M42 42 L50 41 M42 44 L49 46" /></g></>, noBlush: true },
  { id: 'moose', name: '駝鹿', origin: '瑞典', head: '#8E6A52', ears: 'droopy', ear: '#8E6A52', headShape: 'tall', muzzle: '#B08A6E',
    behind: <g {...S('#E7CFA3')}><path d="M24 20 Q14 18 8 8 Q12 6 14 10 Q16 4 20 8 Q22 4 24 10 Z" /><path d="M40 20 Q50 18 56 8 Q52 6 50 10 Q48 4 44 8 Q42 4 40 10 Z" /></g> },
  { id: 'hedgehog', name: '刺蝟', origin: '英國', head: CREAM, ears: 'small', ear: CREAM,
    behind: <path d="M8 40 L4 32 L10 30 L6 22 L14 22 L12 13 L20 16 L22 7 L28 12 L32 4 L36 12 L42 7 L44 16 L52 13 L50 22 L58 22 L54 30 L60 32 L56 40 Z" {...S('#9C8070')} /> },
  { id: 'polarbear', name: '北極熊', origin: '挪威', head: W, ears: 'small', ear: W, muzzle: CREAM },
  { id: 'elephant', name: '大象', origin: '泰國', head: '#BFC6D1', ears: 'big', ear: '#BFC6D1', inner: PINK,
    face: <><Eyes y={32} dx={8} /><path d="M28 38 Q28 50 26 56 Q32 58 34 52 Q36 46 36 38 Z" {...S('#BFC6D1')} /><Blush y={38} /></>, noBlush: true },
  { id: 'tiger', name: '老虎', origin: '韓國', head: '#F2B45E', ears: 'round', ear: '#F2B45E', inner: W, muzzle: W,
    front: <g {...P} strokeWidth={2.6}><path d="M32 18 V24 M27 19 L28 24 M37 19 L36 24 M13 32 H19 M13 37 H18 M51 32 H45 M51 37 H46" /></g> },
  { id: 'formosanbear', name: '台灣黑熊', origin: '台灣', head: '#4A4442', ears: 'round', ear: '#4A4442', inner: '#6B5E58', muzzle: '#C9A57E',
    face: <><g fill="#fff"><circle cx="24.5" cy="34" r="2.6" /><circle cx="39.5" cy="34" r="2.6" /></g><g fill={INK}><circle cx="24.5" cy="34" r="1.6" /><circle cx="39.5" cy="34" r="1.6" /></g><ellipse cx="32" cy="42" rx="7" ry="5.5" fill="#C9A57E" /><Nose y={40} /><Blush y={41} /></>,
    front: <path d="M20 52 L32 58 L44 52" {...P} stroke={W} strokeWidth={3} /> },
  { id: 'leopardcat', name: '石虎', origin: '台灣', head: '#D9B07A', ears: 'pointy', ear: '#D9B07A', inner: W, muzzle: W,
    front: <g><path d="M28 20 V30 M36 20 V30" stroke={W} strokeWidth={2.4} strokeLinecap="round" /><g fill={DARK}><circle cx="18" cy="38" r="1.5" /><circle cx="46" cy="38" r="1.5" /><circle cx="21" cy="44" r="1.3" /><circle cx="43" cy="44" r="1.3" /></g></g> },
  { id: 'flamingo', name: '紅鶴', origin: '古巴', head: PINK, ears: 'none',
    face: <><Eyes y={32} dx={7} /><path d="M30 37 Q42 36 44 44 Q42 50 38 48 Q38 42 30 41 Z" {...S(W)} strokeWidth={2} /><path d="M41 44 Q42 50 38 48 Q39 46 41 44" fill={INK} /><Blush y={40} /></>,
    behind: <path d="M30 18 Q28 8 34 6 Q32 12 36 16" {...S(PINK)} /> },
  { id: 'camel', name: '駱駝', origin: '埃及', head: '#E0B97F', ears: 'small', ear: '#E0B97F', headShape: 'tall', muzzle: '#F0D3A3',
    behind: <path d="M22 18 Q32 8 42 18" {...S('#C99A5E')} />,
    face: <><g {...P} strokeWidth={2.2}><path d="M21 33 Q25 31 29 33 M35 33 Q39 31 43 33" /></g><ellipse cx="32" cy="45" rx="8" ry="6" fill="#F0D3A3" /><path d="M29 43 Q30 41 30 44 M35 43 Q34 41 34 44" {...P} strokeWidth={1.8} /><path d="M29 48 Q32 50 35 48" {...P} strokeWidth={1.8} /><Blush y={39} /></> },
  { id: 'giraffe', name: '長頸鹿', origin: '肯亞', head: '#F6D27A', ears: 'droopy', ear: '#F6D27A', headShape: 'tall', muzzle: '#F3C487',
    behind: <g><path d="M26 18 V8 M38 18 V8" {...P} strokeWidth={3} /><circle cx="26" cy="7" r="3" {...S('#C68E5A')} strokeWidth={2} /><circle cx="38" cy="7" r="3" {...S('#C68E5A')} strokeWidth={2} /></g>,
    front: <g fill="#D6A060"><circle cx="20" cy="28" r="3" /><circle cx="44" cy="27" r="2.5" /><circle cx="32" cy="22" r="2.2" /></g> },
  { id: 'toucan', name: '巨嘴鳥', origin: '巴西', head: INK, ears: 'none',
    front: <ellipse cx="25" cy="36" rx="9" ry="10" fill={W} />,
    face: <><circle cx="25" cy="33" r="4" {...S('#A8D3E6')} strokeWidth={2} /><circle cx="25" cy="33" r="1.8" fill={INK} /><path d="M33 30 Q58 28 60 40 Q50 46 33 42 Z" {...S('#F6A84E')} /><path d="M56 36 Q60 38 60 40 Q57 42 54 41 Z" fill={INK} /></>, noBlush: true },
]

export const ANIMAL_MAP = Object.fromEntries(ANIMALS.map((a) => [a.id, a]))

export function AnimalFace({ id, size = 40, bg, title }: { id: string; size?: number; bg?: string; title?: string }) {
  const a = ANIMAL_MAP[id] ?? ANIMALS[0]
  return (
    <svg width={size} height={size} viewBox="-2 -2 68 68" role="img" aria-label={title ?? a.name} style={{ display: 'block', flex: 'none' }}>
      {bg && <circle cx="32" cy="32" r="33" fill={bg} />}
      {a.behind}
      <EarsSvg type={a.ears} c={a.ear ?? a.head} inner={a.inner} />
      <Head shape={a.headShape} c={a.head} />
      {a.muzzle && <ellipse cx="32" cy="42" rx="8.5" ry="6.5" fill={a.muzzle} />}
      {a.front}
      {a.face ?? (
        <>
          <Eyes />
          <Nose c={a.nose} />
          <Mouth />
        </>
      )}
      {!a.noBlush && !a.face && <Blush />}
    </svg>
  )
}
