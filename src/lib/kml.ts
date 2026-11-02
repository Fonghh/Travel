// 匯出 KML，給 Google 我的地圖（My Maps）匯入

export interface KmlPlace {
  name: string
  lat: number
  lng: number
  description?: string
  style?: 'must' | 'meetup' | 'normal' | 'stay' | 'visited'
}

export interface KmlFolder {
  name: string
  places: KmlPlace[]
  /** 依序連起來的路線（可省略） */
  route?: { name: string; color: string }
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!)

// KML 顏色是 aabbggrr
function kmlColor(hex: string, alpha = 'ff') {
  const h = hex.replace('#', '').toLowerCase()
  return alpha + h.slice(4, 6) + h.slice(2, 4) + h.slice(0, 2)
}

const ICONS: Record<NonNullable<KmlPlace['style']>, string> = {
  must: 'https://maps.google.com/mapfiles/kml/paddle/red-stars.png',
  meetup: 'https://maps.google.com/mapfiles/kml/paddle/ylw-blank.png',
  normal: 'https://maps.google.com/mapfiles/kml/paddle/blu-circle.png',
  visited: 'https://maps.google.com/mapfiles/kml/paddle/grn-circle.png',
  stay: 'https://maps.google.com/mapfiles/kml/paddle/purple-square.png',
}

export function buildKml(docName: string, folders: KmlFolder[]): string {
  const styles = Object.entries(ICONS)
    .map(([id, href]) => `<Style id="${id}"><IconStyle><Icon><href>${href}</href></Icon></IconStyle></Style>`)
    .join('\n    ')
  const body = folders
    .filter((f) => f.places.length)
    .map((f) => {
      const marks = f.places
        .map(
          (p) =>
            `<Placemark><name>${esc(p.name)}</name>${p.description ? `<description>${esc(p.description)}</description>` : ''}<styleUrl>#${p.style ?? 'normal'}</styleUrl><Point><coordinates>${p.lng},${p.lat},0</coordinates></Point></Placemark>`,
        )
        .join('\n      ')
      const line =
        f.route && f.places.length > 1
          ? `\n      <Placemark><name>${esc(f.route.name)}</name><Style><LineStyle><color>${kmlColor(f.route.color)}</color><width>4</width></LineStyle></Style><LineString><tessellate>1</tessellate><coordinates>${f.places.map((p) => `${p.lng},${p.lat},0`).join(' ')}</coordinates></LineString></Placemark>`
          : ''
      return `<Folder><name>${esc(f.name)}</name>\n      ${marks}${line}\n    </Folder>`
    })
    .join('\n    ')
  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${esc(docName)}</name>
    ${styles}
    ${body}
  </Document>
</kml>
`
}
