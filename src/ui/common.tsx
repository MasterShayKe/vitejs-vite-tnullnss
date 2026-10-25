import { CLUB_BY_ID } from '../data/clubs'
import { FORMATIONS } from '../game/formations'
import { matchRating } from '../game/rating'
import type { Club, FormationKey, GameState, Player, Role } from '../game/types'

export function Crest({ club, size = 28 }: { club: Club; size?: number }) {
  return (
    <span
      className="crest"
      style={{ width: size, height: size, background: club.primary, color: club.secondary, fontSize: Math.max(8, size * 0.34) }}
      title={club.name}
    >
      {club.short}
    </span>
  )
}

export function Attr({ value }: { value: number }) {
  const v = Math.round(value)
  const cls = v <= 7 ? 'a1' : v <= 11 ? 'a2' : v <= 15 ? 'a3' : 'a4'
  return <span className={`attr ${cls}`}>{v}</span>
}

export function RoleTag({ role }: { role: Role }) {
  return <span className={`role ${role}`}>{role}</span>
}

export function Bar({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.max(0, Math.min(100, (100 * value) / max))
  const cls = pct < 50 ? 'low' : pct < 75 ? 'mid' : ''
  return (
    <span className={`bar ${cls}`} style={{ display: 'inline-block', width: 60 }}>
      <span style={{ width: `${pct}%` }} />
    </span>
  )
}

export function Status({ p }: { p: Player }) {
  if (p.injuryWeeks > 0) return <span className="chip red">Injured {p.injuryWeeks}w</span>
  if (p.suspended > 0) return <span className="chip amber">Suspended {p.suspended}</span>
  if (p.condition < 60) return <span className="chip amber">Tired</span>
  return null
}

export function Stars({ tier }: { tier: number }) {
  const n = 6 - tier
  return <span className="stars">{'★'.repeat(n)}{'☆'.repeat(5 - n)}</span>
}

export function Seg<T extends string>({ value, options, onChange, labels }: { value: T; options: readonly T[]; onChange: (v: T) => void; labels?: Partial<Record<T, string>> }) {
  return (
    <span className="seg">
      {options.map((o) => (
        <button key={o} className={o === value ? 'active' : ''} onClick={() => onChange(o)} type="button">
          {labels?.[o] ?? o}
        </button>
      ))}
    </span>
  )
}

export function Pitch({
  game,
  formation,
  lineup,
  selected,
  onSlot,
  club,
}: {
  game: GameState
  formation: FormationKey
  lineup: (string | null)[]
  selected?: number | null
  onSlot?: (i: number) => void
  club: Club
}) {
  const slots = FORMATIONS[formation]
  return (
    <div className="pitch">
      <div className="halfway" />
      <div className="centre" />
      {slots.map((s, i) => {
        const p = lineup[i] ? game.players[lineup[i] as string] : undefined
        return (
          <button
            type="button"
            key={i}
            className={`slot ${selected === i ? 'selected' : ''} ${p ? '' : 'empty'}`}
            style={{ left: `${s.x}%`, top: `${100 - s.y}%`, borderColor: selected === i ? undefined : club.primary }}
            onClick={() => onSlot?.(i)}
          >
            <div className="lbl">{s.label}</div>
            <div className="nm">{p ? shortName(p.name) : 'Empty'}</div>
            {p && (
              <div className="rt">
                {matchRating(p, s.role, p.condition).toFixed(1)} · {Math.round(p.condition)}%
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}

export function shortName(name: string): string {
  const parts = name.split(' ')
  if (parts.length < 2) return name
  return `${parts[0][0]}. ${parts.slice(1).join(' ')}`
}

export function clubName(id: string): string {
  return CLUB_BY_ID[id]?.name ?? id
}
