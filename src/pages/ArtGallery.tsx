import { ANIMALS, AnimalFace } from '../art/animals.tsx'
import { Scene } from '../art/scenes.tsx'
import { THEMES } from '../data.ts'

// 插圖總覽（/art），方便檢查畫風
export function ArtGallery() {
  return (
    <main className="page stack lg">
      <h1>插圖總覽</h1>
      <div className="stack">
        {THEMES.map((t) => (
          <div key={t.id} className="stack" style={{ gap: 4 }}>
            <h3>{t.name}</h3>
            <div className="scene-wrap"><Scene theme={t.id} /></div>
          </div>
        ))}
      </div>
      <div className="animal-grid">
        {ANIMALS.map((a) => (
          <div key={a.id} className="animal-opt">
            <AnimalFace id={a.id} size={56} />
            <span>{a.name}</span>
            <span className="muted">{a.origin}</span>
          </div>
        ))}
      </div>
    </main>
  )
}
