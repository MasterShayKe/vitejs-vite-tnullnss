import type { Attrs, Player, Role } from './types'

export function positionFit(from: Role, to: Role): number {
  if (from === to) return 1
  if (from === 'GK' || to === 'GK') return 0.35
  if ((from === 'DF' && to === 'MF') || (from === 'MF' && to === 'DF')) return 0.85
  if ((from === 'MF' && to === 'FW') || (from === 'FW' && to === 'MF')) return 0.85
  return 0.7
}

export function roleRating(attrs: Attrs, role: Role): number {
  const a = attrs
  switch (role) {
    case 'GK':
      return a.goalkeeping * 0.75 + a.physical * 0.1 + a.heading * 0.05 + a.passing * 0.1
    case 'DF':
      return a.defending * 0.45 + a.heading * 0.2 + a.physical * 0.2 + a.pace * 0.15
    case 'MF':
      return (
        a.passing * 0.35 + a.dribbling * 0.15 + a.defending * 0.15 + a.physical * 0.15 + a.shooting * 0.1 + a.pace * 0.1
      )
    case 'FW':
      return a.shooting * 0.35 + a.pace * 0.2 + a.dribbling * 0.2 + a.heading * 0.15 + a.physical * 0.1
  }
}

/** Static ability in a role, 1-20 scale, including out-of-position penalty. */
export function playerRoleRating(p: Player, role: Role): number {
  return roleRating(p.attrs, role) * positionFit(p.role, role)
}

/** Natural-position ability, 1-20. */
export function overall(p: Player): number {
  return roleRating(p.attrs, p.role)
}

export function conditionFactor(condition: number): number {
  return 0.7 + 0.3 * (condition / 100)
}

export function moraleFactor(morale: number): number {
  return 0.95 + 0.1 * (morale / 100)
}

/** Ability on the day: role fit, condition and morale all applied. */
export function matchRating(p: Player, role: Role, condition: number): number {
  return playerRoleRating(p, role) * conditionFactor(condition) * moraleFactor(p.morale)
}

export function isAvailable(p: Player): boolean {
  return p.injuryWeeks <= 0 && p.suspended <= 0
}

export function setPieceTakerScore(p: Player): number {
  return p.attrs.setPieces * 0.7 + p.attrs.passing * 0.3
}

export function penaltyScore(p: Player): number {
  return p.attrs.setPieces * 0.6 + p.attrs.shooting * 0.4
}

export function squadStrength(players: Player[]): number {
  const sorted = players
    .filter((p) => p.role !== 'GK')
    .map(overall)
    .sort((a, b) => b - a)
    .slice(0, 10)
  const gk = players.filter((p) => p.role === 'GK').map(overall).sort((a, b) => b - a)[0] ?? 8
  const sum = sorted.reduce((s, v) => s + v, 0) + gk
  return sum / (sorted.length + 1)
}
