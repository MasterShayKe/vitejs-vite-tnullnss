import { CLUBS } from '../data/clubs'
import { FIRST_NAMES, SURNAMES } from '../data/names'
import { autoPickLineup, autoSetPieces, defaultTactics, randomFormation } from './ai'
import { clamp, gauss, mulberry32, pick, randInt, shuffle, type Rng } from './rng'
import { ATTR_KEYS, TOTAL_ROUNDS, type Attrs, type Fixture, type GameState, type Player, type Role } from './types'

let playerCounter = 0

function makeAttrs(rng: Rng, role: Role, mean: number): Attrs {
  const attrs = {} as Attrs
  for (const key of ATTR_KEYS) {
    attrs[key] = clamp(Math.round(mean + gauss(rng) * 3.2), 1, 20)
  }
  const boost = (k: keyof Attrs, n: number) => {
    attrs[k] = clamp(attrs[k] + n, 1, 20)
  }
  switch (role) {
    case 'GK':
      boost('goalkeeping', 5)
      boost('shooting', -4)
      boost('dribbling', -3)
      break
    case 'DF':
      boost('defending', 4)
      boost('heading', 2)
      boost('goalkeeping', -6)
      boost('shooting', -2)
      break
    case 'MF':
      boost('passing', 4)
      boost('dribbling', 2)
      boost('goalkeeping', -6)
      break
    case 'FW':
      boost('shooting', 4)
      boost('pace', 2)
      boost('goalkeeping', -6)
      boost('defending', -3)
      break
  }
  // Set pieces are a specialist skill: most players are average, a few are excellent.
  attrs.setPieces = clamp(Math.round(mean - 2 + gauss(rng) * 4), 1, 20)
  if (role === 'GK') attrs.setPieces = clamp(attrs.setPieces - 4, 1, 20)
  return attrs
}

export function makePlayer(rng: Rng, clubId: string, role: Role, tierMean: number, season: number, ageOverride?: number): Player {
  const age = ageOverride ?? randInt(rng, 18, 33)
  // Younger players sit further below the club mean but with more room to grow.
  const youthPenalty = age < 21 ? 2 : age < 24 ? 1 : 0
  const mean = tierMean - youthPenalty + gauss(rng) * 1.2
  const attrs = makeAttrs(rng, role, mean)
  const potential = clamp(Math.round(Math.max(mean + 2, tierMean + 1 + rng() * 4)), 8, 20)
  playerCounter++
  return {
    id: `p${season}_${clubId}_${playerCounter}_${Math.floor(rng() * 1e6)}`,
    name: `${pick(rng, FIRST_NAMES)} ${pick(rng, SURNAMES)}`,
    age,
    role,
    clubId,
    attrs,
    potential,
    condition: 100,
    morale: 70,
    injuryWeeks: 0,
    suspended: 0,
    yellows: 0,
    stats: emptyStats(),
  }
}

export function emptyStats() {
  return { apps: 0, goals: 0, assists: 0, ratingSum: 0, motm: 0, setPieceGoals: 0 }
}

export const TIER_MEAN: Record<number, number> = { 1: 15, 2: 13.5, 3: 12, 4: 10.5, 5: 9.2 }

export const SQUAD_SHAPE: { role: Role; count: number }[] = [
  { role: 'GK', count: 2 },
  { role: 'DF', count: 8 },
  { role: 'MF', count: 8 },
  { role: 'FW', count: 5 },
]

export function generateSquad(rng: Rng, clubId: string, tier: number, season: number): Player[] {
  const out: Player[] = []
  for (const { role, count } of SQUAD_SHAPE) {
    for (let i = 0; i < count; i++) out.push(makePlayer(rng, clubId, role, TIER_MEAN[tier], season))
  }
  return out
}

/** Double round-robin via the circle method; 20 teams → 38 rounds. */
export function generateFixtures(rng: Rng, clubIds: string[], season: number): Fixture[] {
  const teams = shuffle(rng, clubIds)
  const n = teams.length
  const half = n / 2
  const rotating = teams.slice(1)
  const fixtures: Fixture[] = []
  for (let r = 0; r < n - 1; r++) {
    const order = [teams[0], ...rotating]
    for (let i = 0; i < half; i++) {
      const a = order[i]
      const b = order[n - 1 - i]
      const flip = (r + i) % 2 === 0
      const home = flip ? a : b
      const away = flip ? b : a
      fixtures.push({
        id: `s${season}r${r + 1}_${home}_${away}`,
        round: r + 1,
        homeId: home,
        awayId: away,
        played: false,
        homeGoals: 0,
        awayGoals: 0,
        scorers: [],
      })
      fixtures.push({
        id: `s${season}r${r + n}_${away}_${home}`,
        round: r + n,
        homeId: away,
        awayId: home,
        played: false,
        homeGoals: 0,
        awayGoals: 0,
        scorers: [],
      })
    }
    rotating.unshift(rotating.pop() as string)
  }
  fixtures.sort((a, b) => a.round - b.round)
  if (fixtures.length !== half * TOTAL_ROUNDS) throw new Error('fixture generation mismatch')
  return fixtures
}

export interface NewGameOptions {
  managerName: string
  myClubId: string
  rivalMode: boolean
  rivalName: string
  seed?: number
}

export function newGame(opts: NewGameOptions): GameState {
  const seed = opts.seed ?? Math.floor(Math.random() * 2 ** 31)
  const rng = mulberry32(seed)
  const players: Record<string, Player> = {}
  for (const club of CLUBS) {
    for (const p of generateSquad(rng, club.id, club.tier, 1)) players[p.id] = p
  }
  const game: GameState = {
    version: 1,
    seed,
    rngState: Math.floor(rng() * 2 ** 31),
    season: 1,
    round: 1,
    phase: 'season',
    managerName: opts.managerName || 'The Gaffer',
    myClubId: opts.myClubId,
    rivalMode: opts.rivalMode,
    rivalName: opts.rivalName || 'The Rival',
    clubs: CLUBS,
    players,
    fixtures: generateFixtures(rng, CLUBS.map((c) => c.id), 1),
    tactics: {},
    setPieces: {},
    training: { focus: 'technical', intensity: 'medium' },
    news: [],
    lastTrainingReport: null,
    history: [],
  }
  for (const club of CLUBS) {
    const formation = club.id === opts.myClubId ? '4-4-2' : randomFormation(rng)
    game.tactics[club.id] = autoPickLineup(game, club.id, defaultTactics(formation))
    game.setPieces[club.id] = autoSetPieces(game, club.id)
  }
  const myClub = CLUBS.find((c) => c.id === opts.myClubId)
  game.news.push({
    id: 'welcome',
    round: 1,
    kind: 'info',
    title: `Welcome to ${myClub?.name ?? 'the club'}, ${game.managerName}`,
    body: `The board expects a season befitting a tier ${myClub?.tier ?? 3} club. Set your tactics, pick your set-piece takers and plan training before the opening fixture.`,
  })
  return game
}

/** Pull a fresh RNG from the saved state and advance the stored seed. */
export function nextRng(game: GameState): Rng {
  const rng = mulberry32(game.rngState)
  game.rngState = Math.floor(rng() * 2 ** 31)
  return rng
}
