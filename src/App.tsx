import { usePath } from './lib/router.ts'
import { TripList } from './pages/TripList.tsx'
import { NewTrip } from './pages/NewTrip.tsx'
import { Join } from './pages/Join.tsx'
import { TripShell } from './trip/TripShell.tsx'
import { ArtGallery } from './pages/ArtGallery.tsx'

export function App() {
  const path = usePath()
  const parts = path.split('/').filter(Boolean)
  if (parts[0] === 'new') return <NewTrip />
  if (parts[0] === 'join' && parts[1]) return <Join invite={parts[1]} />
  if (parts[0] === 't' && parts[1]) return <TripShell key={parts[1]} tripId={parts[1]} tab={parts[2] ?? 'home'} />
  if (parts[0] === 'art') return <ArtGallery />
  return <TripList />
}
