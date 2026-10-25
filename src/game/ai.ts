import { FORMATIONS, FORMATION_KEYS } from './formations'
import { isAvailable, matchRating, penaltyScore, setPieceTakerScore } from './rating'
import { pick, type Rng } from './rng'
import type { FormationKey, GameState, Mentality, Player, SetPieces, Tactics } from './types'

export function clubPlayers(game: GameState, clubId: string): Player[] {
  return Object.values(game.players).filter((p) => p.clubId === clubId)
}

export function defaultTactics(formation: FormationKey): Tactics {
  return {
    formation,
    mentality: 'balanced',
    width: 'normal',
    tempo: 'normal',
    pressing: 'medium',
    lineup: new Array(FORMATIONS[formation].length).fill(null),
    bench: [],
  }
}

/** Greedy best XI for the formation from available players; returns a new Tactics object. */
export function autoPickLineup(game: GameState, clubId: string, tactics: Tactics): Tactics {
  const slots = FORMATIONS[tactics.formation]
  const pool = clubPlayers(game, clubId).filter(isAvailable)
  const used = new Set<string>()
  const lineup: (string | null)[] = new Array(slots.length).fill(null)

  // Fill goalkeepers first, then the most specialised outfield slots.
  const order = slots
    .map((slot, i) => ({ slot, i }))
    .sort((a, b) => (a.slot.role === 'GK' ? -1 : b.slot.role === 'GK' ? 1 : 0))

  for (const { slot, i } of order) {
    let best: Player | null = null
    let bestScore = -1
    for (const p of pool) {
      if (used.has(p.id)) continue
      const score = matchRating(p, slot.role, p.condition)
      if (score > bestScore) {
        bestScore = score
        best = p
      }
    }
    if (best) {
      used.add(best.id)
      lineup[i] = best.id
    }
  }

  const bench = pickBench(pool, used)
  return { ...tactics, lineup, bench }
}

export function pickBench(pool: Player[], used: Set<string>): string[] {
  const rest = pool.filter((p) => !used.has(p.id))
  const gk = rest.filter((p) => p.role === 'GK').sort((a, b) => b.attrs.goalkeeping - a.attrs.goalkeeping)[0]
  const outfield = rest
    .filter((p) => p.role !== 'GK')
    .sort((a, b) => matchRating(b, b.role, b.condition) - matchRating(a, a.role, a.condition))
  const bench: string[] = []
  if (gk) bench.push(gk.id)
  for (const p of outfield) {
    if (bench.length >= 7) break
    bench.push(p.id)
  }
  return bench
}

/** Replace unavailable players in an existing lineup, keeping the user's choices where possible. */
export function repairLineup(game: GameState, clubId: string, tactics: Tactics): { tactics: Tactics; replaced: string[] } {
  const slots = FORMATIONS[tactics.formation]
  const pool = clubPlayers(game, clubId)
  const byId = new Map(pool.map((p) => [p.id, p]))
  const lineup = tactics.lineup.slice(0, slots.length)
  while (lineup.length < slots.length) lineup.push(null)
  const replaced: string[] = []
  const used = new Set<string>()
  for (let i = 0; i < slots.length; i++) {
    const id = lineup[i]
    const p = id ? byId.get(id) : undefined
    if (!p || !isAvailable(p) || used.has(p.id)) {
      if (p && !isAvailable(p)) replaced.push(p.id)
      lineup[i] = null
    } else {
      used.add(p.id)
    }
  }
  for (let i = 0; i < slots.length; i++) {
    if (lineup[i]) continue
    let best: Player | null = null
    let bestScore = -1
    for (const p of pool) {
      if (used.has(p.id) || !isAvailable(p)) continue
      const score = matchRating(p, slots[i].role, p.condition)
      if (score > bestScore) {
        bestScore = score
        best = p
      }
    }
    if (best) {
      used.add(best.id)
      lineup[i] = best.id
    }
  }
  const bench = pickBench(pool.filter(isAvailable), used)
  return { tactics: { ...tactics, lineup, bench }, replaced }
}

export function autoSetPieces(game: GameState, clubId: string): SetPieces {
  const pool = clubPlayers(game, clubId).filter((p) => p.role !== 'GK' && isAvailable(p))
  const byTaker = [...pool].sort((a, b) => setPieceTakerScore(b) - setPieceTakerScore(a))
  const byPen = [...pool].sort((a, b) => penaltyScore(b) - penaltyScore(a))
  const byHead = [...pool].sort((a, b) => b.attrs.heading - a.attrs.heading)
  return {
    cornerTaker: byTaker[0]?.id ?? null,
    freeKickTaker: byTaker[0]?.id ?? null,
    penaltyTaker: byPen[0]?.id ?? null,
    targetMan: byHead[0]?.id ?? null,
    cornerRoutine: 'near',
    freeKickRoutine: 'direct',
    marking: 'zonal',
  }
}

export function randomFormation(rng: Rng): FormationKey {
  return pick(rng, FORMATION_KEYS)
}

/** AI mentality based on relative strength. */
export function aiMentality(own: number, opp: number, isHome: boolean): Mentality {
  const diff = own - opp + (isHome ? 0.4 : -0.4)
  if (diff > 2) return 'attacking'
  if (diff > 0.8) return 'positive'
  if (diff > -0.8) return 'balanced'
  if (diff > -2) return 'cautious'
  return 'defensive'
}
