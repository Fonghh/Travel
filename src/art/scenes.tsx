// 目的地插圖：日系繪本風，平塗＋墨線（viewBox 360x220）
const INK = '#3E3A39'
const CORAL = '#F2A497'
const YELLOW = '#F6D27A'
const MIZU = '#A8D3E6'
const GREEN = '#B9DAA5'
const PAPER = '#FFFCF6'
const W = '#FFFFFF'
const L = { stroke: INK, strokeWidth: 3, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const }
const F = (fill: string) => ({ fill, ...L })

const Cloud = ({ x, y, s = 1, cls = 'anim-drift' }: { x: number; y: number; s?: number; cls?: string }) => (
  <g className={cls}>
    <path
      transform={`translate(${x} ${y}) scale(${s})`}
      d="M0 20 Q-2 8 10 8 Q14 -2 26 2 Q36 -4 42 6 Q54 6 52 20 Z"
      {...F(W)}
    />
  </g>
)
const Sun = ({ x, y, r = 18 }: { x: number; y: number; r?: number }) => (
  <g className="anim-spin-slow" style={{ transformOrigin: `${x}px ${y}px` }}>
    {Array.from({ length: 8 }).map((_, i) => {
      const a = (i * Math.PI) / 4
      return <line key={i} x1={x + Math.cos(a) * (r + 6)} y1={y + Math.sin(a) * (r + 6)} x2={x + Math.cos(a) * (r + 12)} y2={y + Math.sin(a) * (r + 12)} {...L} />
    })}
    <circle cx={x} cy={y} r={r} {...F(YELLOW)} />
  </g>
)
const Snow = () => (
  <g fill={W} stroke={INK} strokeWidth="1.5">
    {[
      [30, 20], [90, 50], [150, 14], [210, 40], [300, 24], [330, 70], [60, 90], [250, 80], [120, 70], [180, 96],
    ].map(([x, y], i) => (
      <circle key={i} cx={x} cy={y} r={i % 3 ? 3 : 4} className="anim-fall" style={{ animationDelay: `${(i * 0.7) % 5}s` }} />
    ))}
  </g>
)

function SnowScene() {
  return (
    <>
      <Sun x={42} y={40} r={15} />
      <Cloud x={262} y={66} s={0.8} />
      {/* 雪山 */}
      <path d="M-10 170 L80 60 L130 110 L190 40 L290 150 L370 100 L370 220 L-10 220 Z" {...F(W)} />
      <path d="M80 60 L62 82 L74 80 L84 92 L96 80 L80 60 Z M190 40 L168 68 L182 64 L192 78 L204 62 Z" fill={MIZU} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      {/* 纜車 */}
      <path d="M40 100 L330 30" {...L} fill="none" />
      <g className="anim-swing" style={{ transformOrigin: '212px 60px' }}>
        <line x1="212" y1="60" x2="212" y2="78" {...L} />
        <rect x="198" y="76" width="28" height="22" rx="6" {...F(CORAL)} />
        <rect x="203" y="80" width="18" height="8" rx="3" {...F(W)} strokeWidth={2} />
      </g>
      {/* 樹 */}
      {[30, 52, 320].map((x, i) => (
        <g key={i} className="anim-sway" style={{ transformOrigin: `${x}px 176px` }}>
          <path d={`M${x} 136 L${x - 14} 162 L${x - 6} 162 L${x - 16} 178 L${x + 16} 178 L${x + 6} 162 L${x + 14} 162 Z`} {...F(GREEN)} />
          <path d={`M${x} 136 L${x - 7} 149 L${x + 7} 149 Z`} fill={W} />
        </g>
      ))}
      {/* 雪地 */}
      <path d="M-10 182 Q90 168 180 180 Q270 192 370 176 L370 220 L-10 220 Z" {...F(W)} />
      {/* 上越新幹線 E7 */}
      <g className="anim-ride">
        <path d="M70 196 L210 196 L210 172 L104 172 Q78 172 64 188 Q62 196 70 196 Z" {...F(W)} />
        <path d="M66 188 Q76 180 104 180 L210 180 L210 186 L68 190 Z" fill={MIZU} />
        <line x1="78" y1="191" x2="210" y2="191" stroke="#C9965B" strokeWidth="2.5" />
        {[118, 140, 162, 184].map((x) => <rect key={x} x={x} y={175} width={14} height={4} rx={2} fill={INK} />)}
        <path d="M70 196 L210 196 L210 172 L104 172 Q78 172 64 188 Q62 196 70 196 Z" fill="none" {...L} />
        <path d="M86 176 Q92 174 98 174 L98 180 L82 180 Z" fill={INK} />
      </g>
      {/* 雪人 */}
      <g className="anim-bob" style={{ transformOrigin: '282px 200px' }}>
        <circle cx="282" cy="186" r="16" {...F(W)} />
        <circle cx="282" cy="158" r="12" {...F(W)} />
        <path d="M270 150 Q282 140 294 150 L292 144 Q282 134 272 144 Z" {...F(CORAL)} strokeWidth={2.4} />
        <circle cx="278" cy="157" r="1.8" fill={INK} />
        <circle cx="286" cy="157" r="1.8" fill={INK} />
        <path d="M282 161 L290 163 L282 164 Z" fill="#F2A86B" stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M270 168 Q282 174 294 168" stroke={CORAL} strokeWidth="5" fill="none" strokeLinecap="round" />
      </g>
      {/* 溫泉 */}
      <ellipse cx="330" cy="204" rx="24" ry="8" {...F(MIZU)} />
      {[322, 334].map((x, i) => (
        <path key={x} d={`M${x} 196 q-5 -7 0 -14 q5 -7 0 -14`} {...L} strokeWidth={2.4} fill="none" className="anim-steam" style={{ animationDelay: `${i * 0.8}s` }} />
      ))}
      <Snow />
    </>
  )
}

function TokyoScene() {
  return (
    <>
      <Sun x={60} y={44} r={16} />
      <Cloud x={250} y={30} />
      <Cloud x={120} y={56} s={0.7} />
      {[[20, 130, 36, 60], [64, 112, 30, 78], [270, 120, 34, 70], [310, 100, 40, 90]].map(([x, y, w, h], i) => (
        <g key={i}>
          <rect x={x} y={y} width={w} height={h} rx={4} {...F(i % 2 ? MIZU : W)} />
          {Array.from({ length: 3 }).map((_, j) => <rect key={j} x={x + 8} y={y + 10 + j * 16} width={w - 16} height={6} rx={2} fill={YELLOW} />)}
        </g>
      ))}
      {/* 東京鐵塔 */}
      <g className="anim-bob" style={{ transformOrigin: '180px 190px' }}>
        <path d="M180 20 L196 120 L216 190 L144 190 L164 120 Z" {...F(CORAL)} />
        <path d="M168 100 L192 100 M158 150 L202 150" {...L} />
        <path d="M172 70 L188 70" {...L} />
        <rect x={160} y={96} width={40} height={10} rx={3} {...F(W)} />
        <rect x={148} y={146} width={64} height={10} rx={3} {...F(W)} />
        <path d="M170 190 Q180 168 190 190" {...F(PAPER)} />
        <line x1="180" y1="20" x2="180" y2="6" {...L} />
      </g>
      <path d="M-10 190 L370 190 L370 220 L-10 220 Z" {...F(GREEN)} />
      {/* 山手線 */}
      <g className="anim-ride">
        <rect x={210} y={168} width={120} height={28} rx={8} {...F(W)} />
        <rect x={210} y={186} width={120} height={5} fill={GREEN} />
        {[220, 248, 276, 304].map((x) => <rect key={x} x={x} y={174} width={18} height={9} rx={2} {...F(MIZU)} strokeWidth={2} />)}
        <circle cx={232} cy={198} r={5} {...F(INK)} />
        <circle cx={308} cy={198} r={5} {...F(INK)} />
      </g>
    </>
  )
}

function KyotoScene() {
  return (
    <>
      <Sun x={300} y={46} r={15} />
      <Cloud x={30} y={36} />
      <path d="M-10 160 Q60 90 140 150 Q220 100 370 150 L370 220 L-10 220 Z" {...F(GREEN)} />
      {/* 五重塔 */}
      <g>
        <rect x={262} y={74} width={24} height={110} {...F(CORAL)} />
        {[0, 1, 2, 3, 4].map((i) => (
          <path key={i} d={`M${244 + i * 2} ${180 - i * 22} L${304 - i * 2} ${180 - i * 22} L${294 - i * 2} ${170 - i * 22} L${254 + i * 2} ${170 - i * 22} Z`} {...F(INK)} strokeWidth={2} />
        ))}
        <line x1="274" y1="72" x2="274" y2="46" {...L} />
      </g>
      {/* 鳥居 */}
      <g className="anim-bob" style={{ transformOrigin: '130px 200px' }}>
        <path d="M70 70 Q130 58 190 70 L186 82 Q130 72 74 82 Z" {...F(CORAL)} />
        <rect x={82} y={92} width={96} height={10} rx={2} {...F(CORAL)} />
        <rect x={92} y={82} width={12} height={118} {...F(CORAL)} />
        <rect x={156} y={82} width={12} height={118} {...F(CORAL)} />
        <rect x={124} y={82} width={12} height={10} {...F(CORAL)} />
      </g>
      {/* 櫻花樹 */}
      <g className="anim-sway" style={{ transformOrigin: '40px 200px' }}>
        <path d="M40 200 L40 150" {...L} strokeWidth={5} />
        <circle cx={40} cy={136} r={26} {...F('#F7C5CC')} />
      </g>
      {[[60, 40], [210, 60], [330, 100], [20, 90]].map(([x, y], i) => (
        <ellipse key={i} cx={x} cy={y} rx={4} ry={2.6} fill="#F7C5CC" stroke={INK} strokeWidth="1.5" className="anim-fall" style={{ animationDelay: `${i * 1.1}s` }} />
      ))}
      <path d="M-10 200 L370 200 L370 220 L-10 220 Z" {...F('#EFE2C8')} />
    </>
  )
}

function OsakaScene() {
  return (
    <>
      <Sun x={56} y={46} r={16} />
      <Cloud x={240} y={24} />
      {/* 大阪城 */}
      <g>
        <path d="M120 200 L130 150 L230 150 L240 200 Z" {...F('#D9D4CE')} />
        <rect x={140} y={110} width={80} height={40} {...F(W)} />
        <path d="M126 112 L234 112 L220 96 L140 96 Z" {...F(GREEN)} />
        <rect x={152} y={68} width={56} height={28} {...F(W)} />
        <path d="M140 70 L220 70 L206 54 L154 54 Z" {...F(GREEN)} />
        <path d="M160 54 L200 54 L190 36 L170 36 Z" {...F(GREEN)} />
        <path d="M168 36 L164 28 M192 36 L196 28" {...L} stroke={YELLOW} strokeWidth={4} />
        {[150, 168, 186, 204].map((x) => <rect key={x} x={x} y={120} width={8} height={12} rx={2} fill={INK} />)}
      </g>
      <path d="M-10 200 L370 200 L370 220 L-10 220 Z" {...F(MIZU)} />
      {/* 章魚燒 */}
      <g className="anim-bob" style={{ transformOrigin: '300px 190px' }}>
        <path d="M262 178 L338 178 L330 200 L270 200 Z" {...F('#E7CFA3')} />
        {[278, 300, 322].map((x) => (
          <g key={x}>
            <circle cx={x} cy={170} r={11} {...F('#E8A85F')} />
            <path d={`M${x - 7} 166 q3 -3 6 0 q3 3 6 0`} stroke="#5B3A29" strokeWidth="2.5" fill="none" />
            <path d={`M${x - 3} 162 l2 2 M${x + 3} 172 l2 -1`} stroke={GREEN} strokeWidth="2" />
          </g>
        ))}
      </g>
      <g className="anim-steam"><path d="M300 150 q-5 -8 0 -16 q5 -8 0 -16" {...L} fill="none" strokeWidth={2.4} /></g>
    </>
  )
}

function OkinawaScene() {
  return (
    <>
      <Sun x={300} y={50} r={20} />
      <Cloud x={40} y={30} />
      <path d="M-10 130 L370 130 L370 220 L-10 220 Z" {...F(MIZU)} />
      {[40, 120, 220, 300].map((x, i) => (
        <path key={x} d={`M${x} ${150 + (i % 2) * 20} q10 -8 20 0 q10 8 20 0`} {...L} stroke={W} strokeWidth={3} fill="none" className="anim-drift" />
      ))}
      <path d="M-10 196 Q120 178 240 190 Q300 196 370 186 L370 220 L-10 220 Z" {...F('#F7E3B5')} />
      {/* 紅瓦屋 */}
      <g>
        <rect x={140} y={150} width={90} height={46} {...F(W)} />
        <path d="M128 152 L242 152 L224 122 L146 122 Z" {...F(CORAL)} />
        <path d="M150 140 L220 140 M140 132 L230 132" stroke={W} strokeWidth="2" />
        <rect x={176} y={168} width={18} height={28} {...F(MIZU)} />
        {/* 風獅爺 */}
        <g className="anim-bob" style={{ transformOrigin: '185px 122px' }}>
          <circle cx={185} cy={110} r={11} {...F(YELLOW)} />
          <path d="M175 104 q10 -10 20 0" stroke={CORAL} strokeWidth="4" fill="none" />
          <circle cx={181} cy={110} r={1.6} fill={INK} />
          <circle cx={189} cy={110} r={1.6} fill={INK} />
          <path d="M180 115 q5 4 10 0" {...L} strokeWidth={2} fill="none" />
        </g>
      </g>
      {/* 椰子樹 */}
      <g className="anim-sway" style={{ transformOrigin: '70px 196px' }}>
        <path d="M70 196 Q62 150 74 112" {...L} strokeWidth={6} fill="none" />
        <path d="M74 112 Q50 96 30 112 Q50 104 74 112 Q60 84 72 72 Q74 92 74 112 Q92 88 112 96 Q92 100 74 112 Q100 104 108 128 Q90 112 74 112 Z" {...F(GREEN)} />
      </g>
    </>
  )
}

function SeoulScene() {
  return (
    <>
      <Cloud x={40} y={28} />
      <Sun x={60} y={90} r={12} />
      <path d="M-10 190 Q120 90 250 150 Q310 120 370 150 L370 220 L-10 220 Z" {...F(GREEN)} />
      {/* 南山塔 */}
      <g className="anim-bob" style={{ transformOrigin: '150px 130px' }}>
        <rect x={144} y={60} width={12} height={70} {...F(W)} />
        <path d="M134 60 L166 60 L162 44 L138 44 Z" {...F(MIZU)} />
        <rect x={132} y={50} width={36} height={6} rx={3} {...F(CORAL)} />
        <line x1={150} y1={44} x2={150} y2={14} {...L} />
        <circle cx={150} cy={12} r={3} fill={CORAL} stroke={INK} strokeWidth={2} />
      </g>
      {/* 韓屋 */}
      <g>
        <rect x={220} y={168} width={110} height={30} {...F(W)} />
        <path d="M200 170 Q214 160 230 150 L320 150 Q336 160 350 170 Q336 166 320 164 L230 164 Q214 166 200 170 Z" {...F(INK)} />
        {[236, 262, 288, 312].map((x) => <rect key={x} x={x} y={174} width={14} height={18} {...F(YELLOW)} strokeWidth={2} />)}
      </g>
      <path d="M-10 198 L370 198 L370 220 L-10 220 Z" {...F('#EFE2C8')} />
    </>
  )
}

function TaiwanScene() {
  return (
    <>
      <Cloud x={220} y={20} />
      <Sun x={60} y={50} r={15} />
      <path d="M-10 170 Q80 100 160 150 Q240 90 370 150 L370 220 L-10 220 Z" {...F(GREEN)} />
      {/* 101 */}
      <g className="anim-bob" style={{ transformOrigin: '270px 190px' }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <path key={i} d={`M${254 - 0} ${170 - i * 20} L${286} ${170 - i * 20} L${292} ${150 - i * 20} L${248} ${150 - i * 20} Z`} {...F(i % 2 ? MIZU : W)} strokeWidth={2.4} />
        ))}
        <rect x={252} y={170} width={36} height={20} {...F(MIZU)} />
        <line x1={270} y1={50} x2={270} y2={20} {...L} />
      </g>
      {/* 天燈 */}
      {[[100, 70], [150, 40]].map(([x, y], i) => (
        <g key={i} className="anim-float" style={{ animationDelay: `${i}s` }}>
          <path d={`M${x - 10} ${y} L${x + 10} ${y} L${x + 8} ${y + 22} L${x - 8} ${y + 22} Z`} {...F(i ? YELLOW : CORAL)} />
          <circle cx={x} cy={y + 18} r={2.4} fill={YELLOW} stroke={INK} strokeWidth="1.5" />
        </g>
      ))}
      <path d="M-10 190 L370 190 L370 220 L-10 220 Z" {...F('#EFE2C8')} />
      {/* 台鐵 */}
      <g className="anim-ride">
        <rect x={30} y={164} width={150} height={30} rx={8} {...F(W)} />
        <rect x={30} y={182} width={150} height={6} fill={MIZU} />
        {[44, 74, 104, 134].map((x) => <rect key={x} x={x} y={170} width={20} height={9} rx={2} {...F(YELLOW)} strokeWidth={2} />)}
        <circle cx={56} cy={196} r={5} {...F(INK)} />
        <circle cx={154} cy={196} r={5} {...F(INK)} />
      </g>
    </>
  )
}

function GenericScene() {
  return (
    <>
      <Sun x={300} y={50} r={16} />
      <Cloud x={30} y={40} />
      <Cloud x={200} y={80} s={0.7} />
      <path d="M-10 180 L70 110 L130 160 L200 90 L290 170 L370 130 L370 220 L-10 220 Z" {...F(GREEN)} />
      <path d="M-10 196 L370 196 L370 220 L-10 220 Z" {...F('#EFE2C8')} />
      {/* 飛機 */}
      <g className="anim-float">
        <path d="M90 60 L190 60 Q206 60 206 68 Q206 76 190 76 L100 76 Z" {...F(W)} />
        <path d="M140 66 L120 40 L132 40 L164 66 Z M140 72 L124 94 L136 94 L162 72 Z" {...F(CORAL)} />
        <path d="M98 62 L88 44 L100 44 L112 62 Z" {...F(MIZU)} />
        {[150, 162, 174].map((x) => <circle key={x} cx={x} cy={67} r={2.4} fill={MIZU} stroke={INK} strokeWidth={1.5} />)}
      </g>
      {/* 行李箱 */}
      <g className="anim-bob" style={{ transformOrigin: '250px 196px' }}>
        <rect x={226} y={140} width={50} height={56} rx={8} {...F(YELLOW)} />
        <path d="M240 140 L240 128 L262 128 L262 140" {...L} fill="none" />
        <line x1={238} y1={152} x2={238} y2={186} {...L} />
        <line x1={264} y1={152} x2={264} y2={186} {...L} />
        <circle cx={246} cy={168} r={6} {...F(CORAL)} strokeWidth={2} />
      </g>
    </>
  )
}

const SCENES: Record<string, () => React.JSX.Element> = {
  snow: SnowScene,
  tokyo: TokyoScene,
  kyoto: KyotoScene,
  osaka: OsakaScene,
  okinawa: OkinawaScene,
  seoul: SeoulScene,
  taiwan: TaiwanScene,
  generic: GenericScene,
}

export function Scene({ theme, className }: { theme: string; className?: string }) {
  const Comp = SCENES[theme] ?? GenericScene
  return (
    <svg viewBox="0 0 360 220" className={'scene ' + (className ?? '')} role="img" aria-hidden="true" preserveAspectRatio="xMidYMax slice">
      <rect x="0" y="0" width="360" height="220" fill="#F3FAFD" />
      <Comp />
    </svg>
  )
}
