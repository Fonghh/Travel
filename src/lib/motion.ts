import { local, setLocal } from './session.ts'

export type MotionPref = 'system' | 'reduce' | 'full'
const KEY = 'travel:motion'

export function getMotion(): MotionPref {
  return local<MotionPref>(KEY, 'system')
}
export function applyMotion(p: MotionPref = getMotion()) {
  const el = document.documentElement
  if (p === 'system') delete el.dataset.motion
  else el.dataset.motion = p
}
export function setMotion(p: MotionPref) {
  setLocal(KEY, p)
  applyMotion(p)
}
export function prefersReduced(): boolean {
  const p = getMotion()
  if (p !== 'system') return p === 'reduce'
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}
