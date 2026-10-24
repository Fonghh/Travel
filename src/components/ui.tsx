import { useEffect } from 'react'
import type { ReactNode } from 'react'
import type { Member, Participants } from '../../shared/types.ts'
import { AnimalFace, ANIMALS } from '../art/animals.tsx'
import { colorHex, MEMBER_COLORS } from '../data.ts'

export function Sheet({ title, onClose, children }: { title: ReactNode; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', esc)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', esc)
    }
  }, [onClose])
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="sheet-head">
          <h2>{title}</h2>
          <button className="icon-btn sm" onClick={onClose} aria-label="關閉">✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Avatar({ m, size = 32 }: { m?: Pick<Member, 'animal' | 'color' | 'name'>; size?: number }) {
  if (!m) return null
  return (
    <span className="avatar" style={{ width: size, height: size, background: colorHex(m.color) }} title={m.name}>
      <AnimalFace id={m.animal} size={size - 4} title={m.name} />
    </span>
  )
}

export function AvatarStack({ members, size = 26, max = 6 }: { members: Member[]; size?: number; max?: number }) {
  const shown = members.slice(0, max)
  return (
    <span className="avatars" aria-label={members.map((m) => m.name).join('、')}>
      {shown.map((m) => <Avatar key={m.id} m={m} size={size} />)}
      {members.length > max && (
        <span className="avatar small" style={{ width: size, height: size, background: '#fff' }}>+{members.length - max}</span>
      )}
    </span>
  )
}

export function inParticipants(p: Participants | undefined, id: string) {
  return !p || p === 'all' || p.includes(id)
}

export function ParticipantsView({ p, members }: { p: Participants; members: Member[] }) {
  if (p === 'all') return <span className="tag all">👥 全員</span>
  const ms = members.filter((m) => p.includes(m.id))
  return <AvatarStack members={ms} />
}

export function ParticipantsPicker({ value, onChange, members, me }: { value: Participants; onChange: (p: Participants) => void; members: Member[]; me: string }) {
  const all = value === 'all'
  const set = new Set(all ? members.map((m) => m.id) : value)
  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="seg">
        <button type="button" aria-pressed={all} onClick={() => onChange('all')}>👥 全員（主線）</button>
        <button type="button" aria-pressed={!all} onClick={() => onChange(all ? [me] : value)}>🌿 部分成員（支線）</button>
      </div>
      {!all && (
        <div className="row wrap" style={{ gap: 6 }}>
          {members.map((m) => {
            const on = set.has(m.id)
            return (
              <button
                key={m.id}
                type="button"
                className="seg-member"
                aria-pressed={on}
                onClick={() => {
                  const next = new Set(set)
                  if (on) next.delete(m.id)
                  else next.add(m.id)
                  onChange([...next])
                }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 10px 2px 2px', borderRadius: 999, cursor: 'pointer',
                  border: '2.5px solid var(--ink)', background: on ? 'var(--yellow)' : 'var(--white)', opacity: on ? 1 : 0.6,
                }}
              >
                <Avatar m={m} size={26} />
                <span className="small">{m.name}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function AnimalPicker({ value, onChange, taken }: { value: string; onChange: (id: string) => void; taken: Set<string> }) {
  return (
    <div className="animal-grid">
      {ANIMALS.map((a) => (
        <button
          key={a.id}
          type="button"
          className="animal-opt"
          aria-pressed={value === a.id}
          disabled={taken.has(a.id) && value !== a.id}
          onClick={() => onChange(a.id)}
          title={`${a.name}（${a.origin}）`}
        >
          <AnimalFace id={a.id} size={44} />
          <span>{a.name}</span>
        </button>
      ))}
    </div>
  )
}

export function ColorPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return (
    <div className="row wrap">
      {MEMBER_COLORS.map((c) => (
        <button key={c.id} type="button" className="swatch" style={{ background: c.hex }} aria-pressed={value === c.id} aria-label={c.name} title={c.name} onClick={() => onChange(c.id)} />
      ))}
    </div>
  )
}

export function Empty({ icon, children }: { icon: string; children: ReactNode }) {
  return (
    <div className="empty">
      <div style={{ fontSize: '2.4rem' }}>{icon}</div>
      {children}
    </div>
  )
}

export function Field({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  )
}

export function money(n: number, cur = 'TWD') {
  const digits = cur === 'TWD' || cur === 'JPY' || cur === 'KRW' ? 0 : 2
  const sign = { TWD: 'NT$', JPY: '¥', KRW: '₩', USD: 'US$', EUR: '€', HKD: 'HK$', THB: '฿', CNY: 'CN¥', SGD: 'S$' }[cur] ?? cur + ' '
  return sign + n.toLocaleString('zh-TW', { maximumFractionDigits: digits, minimumFractionDigits: 0 })
}
