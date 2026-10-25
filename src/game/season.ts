import { CLUB_BY_ID } from '../data/clubs'
import { aiMentality, autoPickLineup, autoSetPieces, clubPlayers, defaultTactics, randomFormation, repairLineup } from './ai'
import { emptyStats, generateFixtures, makePlayer, nextRng, TIER_MEAN } from './generate'
import { MatchSim, type MatchResult, type SideInput } from './match'
import { overall, squadStrength } from './rating'
import { clamp, type Rng } from './rng'
import {
  TOTAL_ROUNDS,
  type AttrKey,
  type Club,
  type Fixture,
  type GameState,
  type Intensity,
  type Player,
  type TrainingFocus,
  type TrainingReport,
} from './types'

export const FOCUS_ATTRS: Record<TrainingFocus, AttrKey[]> = {
  attack: ['shooting', 'dribbling', 'heading'],
  defence: ['defending', 'heading', 'physical'],
  technical: ['passing', 'dribbling'],
  fitness: ['pace', 'physical'],
  setpieces: ['setPieces', 'shooting', 'heading'],
  rest: [],
}

export const FOCUS_INFO: Record<TrainingFocus, { title: string; blurb: string }> = {
  attack: { title: 'Attacking', blurb: 'Finishing drills and movement in the final third. Improves shooting, dribbling and heading.' },
  defence: { title: 'Defending', blurb: 'Shape work and duels. Improves defending, heading and physical strength.' },
  technical: { title: 'Technical', blurb: 'Possession and passing patterns. Improves passing and dribbling.' },
  fitness: { title: 'Fitness', blurb: 'Conditioning. Improves pace and physical, and players recover faster.' },
  setpieces: { title: 'Set Pieces', blurb: 'Dead-ball routines. Improves set pieces, with smaller gains to shooting and heading.' },
  rest: { title: 'Rest', blurb: 'No development, but the squad recovers fully and injury risk is minimal.' },
}

const INTENSITY_MULT: Record<Intensity, number> = { light: 0.6, medium: 1, heavy: 1.45 }
const INTENSITY_COND: Record<Intensity, number> = { light: 8, medium: 0, heavy: -12 }
const INTENSITY_INJURY: Record<Intensity, number> = { light: 0.004, medium: 0.009, heavy: 0.02 }

function growthRate(age: number): number {
  if (age <= 20) return 0.16
  if (age <= 23) return 0.1
  if (age <= 27) return 0.05
  if (age <= 30) return 0.015
  return -0.03
}

function trainSquad(rng: Rng, players: Player[], focus: TrainingFocus, intensity: Intensity, report: TrainingReport | null) {
  const attrs = FOCUS_ATTRS[focus]
  for (const p of players) {
    // Recovery.
    const recover = 32 + INTENSITY_COND[intensity] + (focus === 'fitness' ? 6 : 0) + (focus === 'rest' ? 25 : 0) + (p.attrs.physical - 10) * 0.6
    p.condition = clamp(Math.round(p.condition + recover), 20, 100)
    if (p.injuryWeeks > 0) {
      p.injuryWeeks--
      continue
    }
    if (focus === 'rest') continue
    // Training injuries.
    if (rng() < INTENSITY_INJURY[intensity]) {
      p.injuryWeeks = 1 + Math.floor(rng() * 3)
      report?.injuries.push(p.id)
      continue
    }
    const rate = growthRate(p.age) * INTENSITY_MULT[intensity]
    for (const key of attrs) {
      if (p.role === 'GK' && key !== 'physical' && key !== 'pace' && key !== 'heading') continue
      const before = p.attrs[key]
      const cap = key === 'goalkeeping' ? p.potential : p.potential
      let delta = rate * (0.6 + rng() * 0.9) * (focus === 'setpieces' && key !== 'setPieces' ? 0.4 : 1)
      if (before >= cap) delta = Math.min(delta, 0)
      const after = clamp(before + delta, 1, 20)
      p.attrs[key] = Math.round(after * 100) / 100
      if (report && Math.round(after * 10) !== Math.round(before * 10)) {
        report.changes.push({ playerId: p.id, attr: key, delta: Math.round((after - before) * 10) / 10 })
      }
    }
    // Goalkeepers develop their core skill through any session.
    if (p.role === 'GK') {
      const before = p.attrs.goalkeeping
      const delta = rate * (0.5 + rng() * 0.7)
      const after = clamp(before + (before >= p.potential ? Math.min(delta, 0) : delta), 1, 20)
      p.attrs.goalkeeping = Math.round(after * 100) / 100
      if (report && Math.round(after * 10) !== Math.round(before * 10)) {
        report.changes.push({ playerId: p.id, attr: 'goalkeeping', delta: Math.round((after - before) * 10) / 10 })
      }
    }
    // Age-related decline on pace for veterans regardless of focus.
    if (p.age >= 31) {
      p.attrs.pace = clamp(Math.round((p.attrs.pace - 0.02) * 100) / 100, 1, 20)
    }
  }
}

/** Weekly training for every club; the user's club produces a report. */
function runTraining(game: GameState): void {
  const rng = nextRng(game)
  const report: TrainingReport = {
    round: game.round,
    focus: game.training.focus,
    intensity: game.training.intensity,
    changes: [],
    injuries: [],
  }
  for (const club of game.clubs) {
    const squad = clubPlayers(game, club.id)
    if (club.id === game.myClubId) {
      trainSquad(rng, squad, game.training.focus, game.training.intensity, report)
    } else {
      const focuses: TrainingFocus[] = ['attack', 'defence', 'technical', 'fitness']
      trainSquad(rng, squad, focuses[Math.floor(rng() * focuses.length)], 'medium', null)
    }
  }
  game.lastTrainingReport = report
  for (const id of report.injuries) {
    const p = game.players[id]
    game.news.unshift({
      id: `inj_${game.round}_${id}`,
      round: game.round,
      kind: 'injury',
      title: `${p.name} injured in training`,
      body: `${p.name} picked up a knock during a ${game.training.intensity} ${FOCUS_INFO[game.training.focus].title.toLowerCase()} session and will miss around ${p.injuryWeeks} week${p.injuryWeeks === 1 ? '' : 's'}.`,
    })
  }

}

/** Prepares lineups and AI tactics for this round. Idempotent per round via phase. */
export function prepareWeek(game: GameState): void {
  if (game.phase !== 'season') return
  // Lineups and AI tactics for this round.
  const fixtures = game.fixtures.filter((f) => f.round === game.round)
  const strength: Record<string, number> = {}
  for (const club of game.clubs) strength[club.id] = squadStrength(clubPlayers(game, club.id))
  for (const f of fixtures) {
    for (const [clubId, oppId, isHome] of [
      [f.homeId, f.awayId, true],
      [f.awayId, f.homeId, false],
    ] as const) {
      if (clubId === game.myClubId) {
        const { tactics, replaced } = repairLineup(game, clubId, game.tactics[clubId])
        game.tactics[clubId] = tactics
        if (replaced.length) {
          game.news.unshift({
            id: `rep_${game.round}`,
            round: game.round,
            kind: 'info',
            title: 'Lineup changes forced',
            body: `${replaced.map((id) => game.players[id].name).join(', ')} ${replaced.length === 1 ? 'is' : 'are'} unavailable. The assistant has filled the gap, but you may want to check Tactics.`,
          })
        }
        const sp = game.setPieces[clubId]
        const fix = (id: string | null) => (id && game.players[id] && game.players[id].injuryWeeks <= 0 && game.players[id].suspended <= 0 ? id : null)
        game.setPieces[clubId] = { ...sp, cornerTaker: fix(sp.cornerTaker), freeKickTaker: fix(sp.freeKickTaker), penaltyTaker: fix(sp.penaltyTaker), targetMan: fix(sp.targetMan) }
      } else {
        const base = game.tactics[clubId]
        const picked = autoPickLineup(game, clubId, {
          ...base,
          mentality: aiMentality(strength[clubId], strength[oppId], isHome),
        })
        game.tactics[clubId] = picked
        game.setPieces[clubId] = { ...autoSetPieces(game, clubId), cornerRoutine: game.setPieces[clubId].cornerRoutine, freeKickRoutine: game.setPieces[clubId].freeKickRoutine, marking: game.setPieces[clubId].marking }
      }
    }
  }
  game.phase = 'match'
}

export function myFixture(game: GameState): Fixture | undefined {
  return game.fixtures.find((f) => f.round === game.round && (f.homeId === game.myClubId || f.awayId === game.myClubId))
}

export function sideInput(game: GameState, clubId: string): SideInput {
  return {
    club: CLUB_BY_ID[clubId],
    squad: clubPlayers(game, clubId),
    tactics: game.tactics[clubId],
    setPieces: game.setPieces[clubId],
  }
}

export function createMatch(game: GameState, fixture: Fixture): MatchSim {
  return new MatchSim(sideInput(game, fixture.homeId), sideInput(game, fixture.awayId), nextRng(game))
}

function applyResult(game: GameState, fixture: Fixture, result: MatchResult) {
  fixture.played = true
  fixture.homeGoals = result.home.goals
  fixture.awayGoals = result.away.goals
  fixture.scorers = [...result.home.scorers, ...result.away.scorers]
  for (const side of [result.home, result.away]) {
    const won = side.goals > (side === result.home ? result.away.goals : result.home.goals)
    const lost = side.goals < (side === result.home ? result.away.goals : result.home.goals)
    for (const id of side.played) {
      const p = game.players[id]
      if (!p) continue
      p.stats.apps++
      p.stats.ratingSum += side.ratings[id] ?? 6
      p.condition = clamp(Math.round(side.minutesCondition[id] ?? 60), 10, 100)
      p.morale = clamp(p.morale + (won ? 6 : lost ? -6 : 1), 20, 100)
    }
    for (const s of side.scorers) {
      const p = game.players[s.playerId]
      if (!p) continue
      p.stats.goals++
      if (s.setPiece) p.stats.setPieceGoals++
    }
    if (side.motm) game.players[side.motm].stats.motm++
    for (const inj of side.injuries) {
      const p = game.players[inj.playerId]
      if (p) p.injuryWeeks = Math.max(p.injuryWeeks, inj.weeks)
    }
    for (const id of side.reds) {
      const p = game.players[id]
      if (p) p.suspended = Math.max(p.suspended, 2)
    }
    for (const id of side.yellows) {
      const p = game.players[id]
      if (!p) continue
      p.yellows++
      if (p.yellows % 5 === 0) p.suspended = Math.max(p.suspended, 1)
    }
    // Squad players who did not play recover morale slightly and keep condition.
    for (const p of clubPlayers(game, side.clubId)) {
      if (!side.played.includes(p.id)) p.morale = clamp(p.morale + (won ? 2 : lost ? -2 : 0), 20, 100)
    }
  }
  for (const s of [...result.home.scorers, ...result.away.scorers]) {
    const a = s.assistId ? game.players[s.assistId] : undefined
    if (a) a.stats.assists++
  }
}

/** Commit the user's match, simulate the rest of the round, and move to next week. */
export function finishWeek(game: GameState, myResult: MatchResult): void {
  const fixture = myFixture(game)
  if (!fixture) return
  applyResult(game, fixture, myResult)
  const mySide = myResult.home.clubId === game.myClubId ? myResult.home : myResult.away
  const oppSide = mySide === myResult.home ? myResult.away : myResult.home
  const won = mySide.goals > oppSide.goals
  const drew = mySide.goals === oppSide.goals
  const motm = mySide.motm ? game.players[mySide.motm] : null
  game.news.unshift({
    id: `res_${game.season}_${game.round}`,
    round: game.round,
    kind: 'result',
    title: `${won ? 'Win' : drew ? 'Draw' : 'Defeat'}: ${CLUB_BY_ID[myResult.home.clubId].name} ${myResult.home.goals} - ${myResult.away.goals} ${CLUB_BY_ID[myResult.away.clubId].name}`,
    body: `${motm ? `${motm.name} was your standout performer (${(mySide.ratings[motm.id] ?? 6).toFixed(1)}). ` : ''}${mySide.stats.setPieceGoals ? `${mySide.stats.setPieceGoals} of your goals came from set pieces. ` : ''}${mySide.injuries.length ? `Injury concern: ${mySide.injuries.map((i) => game.players[i.playerId].name).join(', ')}.` : ''}`,
  })

  for (const f of game.fixtures.filter((f) => f.round === game.round && f.id !== fixture.id)) {
    const sim = createMatch(game, f)
    sim.runToEnd()
    applyResult(game, f, sim.result())
  }

  // Suspensions tick down after the round, then the squads train and recover for next week.
  for (const p of Object.values(game.players)) {
    if (p.suspended > 0) p.suspended--
  }
  runTraining(game)

  game.round++
  if (game.round > TOTAL_ROUNDS) {
    game.phase = 'seasonEnd'
    const table = leagueTable(game)
    const mine = table.findIndex((r) => r.clubId === game.myClubId) + 1
    game.history.push({ season: game.season, position: mine, champion: table[0].clubId, points: table[mine - 1].points })
    game.news.unshift({
      id: `end_${game.season}`,
      round: game.round,
      kind: 'award',
      title: `Season ${game.season} over: ${CLUB_BY_ID[table[0].clubId].name} are champions`,
      body: `You finished ${ordinal(mine)} with ${table[mine - 1].points} points.`,
    })
  } else {
    game.phase = 'season'
  }
  if (game.news.length > 60) game.news.length = 60
}

export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

export interface TableRow {
  clubId: string
  played: number
  won: number
  drawn: number
  lost: number
  gf: number
  ga: number
  gd: number
  points: number
  form: ('W' | 'D' | 'L')[]
}

export function leagueTable(game: GameState): TableRow[] {
  const rows: Record<string, TableRow> = {}
  for (const c of game.clubs) rows[c.id] = { clubId: c.id, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, form: [] }
  const played = game.fixtures.filter((f) => f.played).sort((a, b) => a.round - b.round)
  for (const f of played) {
    const h = rows[f.homeId]
    const a = rows[f.awayId]
    h.played++
    a.played++
    h.gf += f.homeGoals
    h.ga += f.awayGoals
    a.gf += f.awayGoals
    a.ga += f.homeGoals
    if (f.homeGoals > f.awayGoals) {
      h.won++
      a.lost++
      h.points += 3
      h.form.push('W')
      a.form.push('L')
    } else if (f.homeGoals < f.awayGoals) {
      a.won++
      h.lost++
      a.points += 3
      a.form.push('W')
      h.form.push('L')
    } else {
      h.drawn++
      a.drawn++
      h.points++
      a.points++
      h.form.push('D')
      a.form.push('D')
    }
  }
  const out = Object.values(rows)
  for (const r of out) {
    r.gd = r.gf - r.ga
    r.form = r.form.slice(-5)
  }
  out.sort((x, y) => y.points - x.points || y.gd - x.gd || y.gf - x.gf || CLUB_BY_ID[x.clubId].name.localeCompare(CLUB_BY_ID[y.clubId].name))
  return out
}

export function topScorers(game: GameState, limit = 10): Player[] {
  return Object.values(game.players)
    .filter((p) => p.stats.goals > 0)
    .sort((a, b) => b.stats.goals - a.stats.goals || b.stats.assists - a.stats.assists)
    .slice(0, limit)
}

/** Age the squads, retire veterans, promote youth, reset stats, and generate new fixtures. */
export function startNewSeason(game: GameState): void {
  const rng = nextRng(game)
  game.season++
  game.round = 1
  game.phase = 'season'
  const removed: string[] = []
  for (const p of Object.values(game.players)) {
    p.age++
    p.stats = emptyStats()
    p.yellows = 0
    p.suspended = 0
    p.injuryWeeks = 0
    p.condition = 100
    p.morale = 70
    if (p.age >= 34 && rng() < 0.5) removed.push(p.id)
    else if (p.age >= 37) removed.push(p.id)
  }
  const retiredNames = removed.filter((id) => game.players[id].clubId === game.myClubId).map((id) => game.players[id].name)
  for (const id of removed) {
    const club: Club = CLUB_BY_ID[game.players[id].clubId]
    const role = game.players[id].role
    delete game.players[id]
    const youth = makePlayer(rng, club.id, role, TIER_MEAN[club.tier] - 1.5, game.season, 18 + Math.floor(rng() * 3))
    game.players[youth.id] = youth
  }
  game.fixtures = generateFixtures(rng, game.clubs.map((c) => c.id), game.season)
  for (const club of game.clubs) {
    const prev = game.tactics[club.id]
    const formation = club.id === game.myClubId ? prev.formation : randomFormation(rng)
    const base = club.id === game.myClubId ? prev : defaultTactics(formation)
    game.tactics[club.id] = autoPickLineup(game, club.id, { ...base, formation })
    const sp = game.setPieces[club.id]
    const auto = autoSetPieces(game, club.id)
    game.setPieces[club.id] = {
      ...auto,
      cornerRoutine: sp.cornerRoutine,
      freeKickRoutine: sp.freeKickRoutine,
      marking: sp.marking,
      cornerTaker: sp.cornerTaker && game.players[sp.cornerTaker] ? sp.cornerTaker : auto.cornerTaker,
      freeKickTaker: sp.freeKickTaker && game.players[sp.freeKickTaker] ? sp.freeKickTaker : auto.freeKickTaker,
      penaltyTaker: sp.penaltyTaker && game.players[sp.penaltyTaker] ? sp.penaltyTaker : auto.penaltyTaker,
      targetMan: sp.targetMan && game.players[sp.targetMan] ? sp.targetMan : auto.targetMan,
    }
  }
  game.lastTrainingReport = null
  game.news.unshift({
    id: `new_${game.season}`,
    round: 1,
    kind: 'info',
    title: `Season ${game.season} begins`,
    body: `${retiredNames.length ? `${retiredNames.join(', ')} ${retiredNames.length === 1 ? 'has' : 'have'} retired and youth players have stepped up. ` : ''}The fixture list is out. Review the squad before the opener.`,
  })
}

export function playerAvgRating(p: Player): number {
  return p.stats.apps ? p.stats.ratingSum / p.stats.apps : 0
}

export { overall }
