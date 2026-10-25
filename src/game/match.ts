import { FORMATIONS, type Slot } from './formations'
import { matchRating, penaltyScore, setPieceTakerScore } from './rating'
import { clamp, pick, weightedPick, type Rng } from './rng'
import type {
  Club,
  CornerRoutine,
  MatchEvent,
  MatchStats,
  Mentality,
  Player,
  Scorer,
  SetPieces,
  SideKey,
  Tactics,
} from './types'

export interface SideInput {
  club: Club
  squad: Player[]
  tactics: Tactics
  setPieces: SetPieces
}

interface OnPitch {
  player: Player
  slot: Slot
  cond: number
  booked: boolean
}

interface SideState {
  key: SideKey
  club: Club
  onPitch: OnPitch[]
  bench: Player[]
  subsUsed: number
  tactics: Tactics
  sp: SetPieces
  stats: MatchStats
  goals: number
  scorers: Scorer[]
  ratings: Map<string, number>
  played: Set<string>
  injuries: { playerId: string; weeks: number }[]
  reds: string[]
  yellows: string[]
  possessionMinutes: number
}

export interface SideResult {
  clubId: string
  goals: number
  stats: MatchStats
  scorers: Scorer[]
  ratings: Record<string, number>
  played: string[]
  minutesCondition: Record<string, number>
  injuries: { playerId: string; weeks: number }[]
  reds: string[]
  yellows: string[]
  motm: string | null
}

export interface MatchResult {
  home: SideResult
  away: SideResult
  events: MatchEvent[]
}

const MENTALITY_ATT: Record<Mentality, number> = {
  defensive: 0.87,
  cautious: 0.94,
  balanced: 1,
  positive: 1.07,
  attacking: 1.15,
}
const MENTALITY_DEF: Record<Mentality, number> = {
  defensive: 1.14,
  cautious: 1.06,
  balanced: 1,
  positive: 0.95,
  attacking: 0.88,
}

export class MatchSim {
  minute = 0
  stoppage: number
  finished = false
  events: MatchEvent[] = []
  readonly home: SideState
  readonly away: SideState
  private eventId = 0
  private rng: Rng

  constructor(home: SideInput, away: SideInput, rng: Rng) {
    this.rng = rng
    this.home = this.makeSide('home', home)
    this.away = this.makeSide('away', away)
    this.stoppage = 1 + Math.floor(rng() * 4)
    this.push(0, 'kickoff', 'none', `${this.home.club.name} v ${this.away.club.name} is under way at ${this.home.club.stadium}.`)
  }

  private makeSide(key: SideKey, input: SideInput): SideState {
    const slots = FORMATIONS[input.tactics.formation]
    const byId = new Map(input.squad.map((p) => [p.id, p]))
    const onPitch: OnPitch[] = []
    input.tactics.lineup.forEach((id, i) => {
      const p = id ? byId.get(id) : undefined
      const slot = slots[i]
      if (p && slot) onPitch.push({ player: p, slot, cond: p.condition, booked: false })
    })
    const bench = input.tactics.bench.map((id) => byId.get(id)).filter((p): p is Player => !!p)
    const side: SideState = {
      key,
      club: input.club,
      onPitch,
      bench,
      subsUsed: 0,
      tactics: { ...input.tactics },
      sp: input.setPieces,
      stats: { possession: 0, shots: 0, onTarget: 0, corners: 0, fouls: 0, setPieceGoals: 0 },
      goals: 0,
      scorers: [],
      ratings: new Map(),
      played: new Set(onPitch.map((o) => o.player.id)),
      injuries: [],
      reds: [],
      yellows: [],
      possessionMinutes: 0,
    }
    for (const o of onPitch) side.ratings.set(o.player.id, 6.2)
    return side
  }

  side(key: SideKey): SideState {
    return key === 'home' ? this.home : this.away
  }

  setMentality(key: SideKey, mentality: Mentality) {
    const side = this.side(key)
    if (side.tactics.mentality === mentality) return
    side.tactics = { ...side.tactics, mentality }
    this.push(this.minute, 'info', key, `${side.club.short} switch to a ${mentality} mentality.`)
  }

  get score() {
    return { home: this.home.goals, away: this.away.goals }
  }

  private push(minute: number, type: MatchEvent['type'], side: SideKey | 'none', text: string, playerId?: string): MatchEvent {
    const ev: MatchEvent = { id: this.eventId++, minute, type, side, text, playerId }
    this.events.push(ev)
    return ev
  }

  private strength(side: SideState) {
    const att: number[] = []
    const mid: number[] = []
    const def: number[] = []
    let gk = 4
    for (const o of side.onPitch) {
      const r = matchRating(o.player, o.slot.role, o.cond)
      switch (o.slot.role) {
        case 'GK':
          gk = r
          break
        case 'DF':
          def.push(r)
          break
        case 'MF':
          mid.push(r)
          break
        case 'FW':
          att.push(r)
          break
      }
    }
    const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)
    const nAtt = att.length || 1
    const nDef = def.length || 1
    const midAvg = avg(mid)
    const attack = (att.reduce((a, b) => a + b, 0) + 0.5 * midAvg * mid.length) / (nAtt + 0.5 * mid.length) || midAvg
    const defence = (def.reduce((a, b) => a + b, 0) + 0.4 * midAvg * mid.length) / (nDef + 0.4 * mid.length) || midAvg
    const t = side.tactics
    const missing = 11 - side.onPitch.length
    const shortHanded = 1 - missing * 0.07
    const widthAtt = t.width === 'wide' ? 1.03 : t.width === 'narrow' ? 0.98 : 1
    const widthDef = t.width === 'wide' ? 0.98 : t.width === 'narrow' ? 1.03 : 1
    const pressMid = t.pressing === 'high' ? 1.06 : t.pressing === 'low' ? 0.95 : 1
    return {
      attack: attack * MENTALITY_ATT[t.mentality] * widthAtt * shortHanded,
      midfield: midAvg * pressMid * shortHanded + (missing ? 0 : 0),
      defence: defence * MENTALITY_DEF[t.mentality] * widthDef * shortHanded,
      gk,
    }
  }

  private outfield(side: SideState): OnPitch[] {
    return side.onPitch.filter((o) => o.slot.role !== 'GK')
  }

  private keeper(side: SideState): number {
    const gk = side.onPitch.find((o) => o.slot.role === 'GK')
    return gk ? matchRating(gk.player, 'GK', gk.cond) : 5
  }

  private findOnPitch(side: SideState, id: string | null): OnPitch | undefined {
    if (!id) return undefined
    return side.onPitch.find((o) => o.player.id === id)
  }

  private taker(side: SideState, preferred: string | null): OnPitch {
    return this.findOnPitch(side, preferred) ?? this.outfield(side).sort((a, b) => setPieceTakerScore(b.player) - setPieceTakerScore(a.player))[0]
  }

  private bump(side: SideState, playerId: string, delta: number) {
    side.ratings.set(playerId, (side.ratings.get(playerId) ?? 6) + delta)
  }

  /** Advance the match by one minute. Returns the events generated this minute. */
  tick(): MatchEvent[] {
    if (this.finished) return []
    const before = this.events.length
    this.minute++
    const m = this.minute

    if (m === 46) {
      this.push(45, 'halftime', 'none', `Half time: ${this.home.club.short} ${this.home.goals} - ${this.away.goals} ${this.away.club.short}.`)
      this.recover(this.home, 6)
      this.recover(this.away, 6)
    }

    const hs = this.strength(this.home)
    const as = this.strength(this.away)

    const sharpen = (x: number) => Math.pow(Math.max(0.1, x), 1.6)
    const pHome = sharpen(hs.midfield * 1.04) / (sharpen(hs.midfield * 1.04) + sharpen(as.midfield))
    const possessing = this.rng() < pHome ? this.home : this.away
    possessing.possessionMinutes++

    const tempoMult = (t: SideState) => (t.tactics.tempo === 'fast' ? 1.12 : t.tactics.tempo === 'slow' ? 0.9 : 1)
    const attacking = possessing
    const defending = possessing === this.home ? this.away : this.home
    const attS = attacking === this.home ? hs : as
    const defS = attacking === this.home ? as : hs
    const chanceP = 0.29 * tempoMult(attacking) * ((2 * attS.attack) / (attS.attack + defS.defence)) * (attacking === this.home ? 1.06 : 0.96)

    if (this.rng() < chanceP) {
      const roll = this.rng()
      if (roll < 0.7) this.openPlay(attacking, defending, defS, 1, 'open')
      else if (roll < 0.9) this.corner(attacking, defending, defS)
      else if (roll < 0.99) this.freeKick(attacking, defending, defS)
      else this.penalty(attacking, defending)
    }

    // Fouls, cards, injuries.
    for (const side of [this.home, this.away]) {
      const opp = side === this.home ? this.away : this.home
      const pressFoul = side.tactics.pressing === 'high' ? 1.25 : side.tactics.pressing === 'low' ? 0.85 : 1
      if (this.rng() < 0.12 * pressFoul) {
        side.stats.fouls++
        const offender = weightedPick(this.rng, this.outfield(side), (o) => 2 + o.player.attrs.defending * 0.6 + o.player.attrs.physical * 0.4)
        const r = this.rng()
        if (r < 0.004) this.sendOff(side, offender, 'straight red')
        else if (r < 0.16) {
          if (offender.booked && this.rng() < 0.4) this.sendOff(side, offender, 'second yellow')
          else {
            offender.booked = true
            side.yellows.push(offender.player.id)
            this.push(m, 'yellow', side.key, `Yellow card for ${offender.player.name} (${side.club.short}) after a late challenge on ${pick(this.rng, this.outfield(opp)).player.name}.`, offender.player.id)
          }
        }
      }
      const fatigue = side.onPitch.reduce((s, o) => s + (100 - o.cond), 0) / Math.max(1, side.onPitch.length)
      if (this.rng() < 0.00055 * (1 + fatigue / 40)) {
        const victim = pick(this.rng, side.onPitch)
        const weeks = 1 + Math.floor(this.rng() * 5)
        side.injuries.push({ playerId: victim.player.id, weeks })
        this.push(m, 'injury', side.key, `${victim.player.name} goes down and cannot continue. The ${side.club.short} physio signals for a change.`, victim.player.id)
        this.substitute(side, victim, true)
      }
    }

    // Planned substitutions.
    if (m === 62 || m === 71 || m === 80) {
      this.plannedSub(this.home)
      this.plannedSub(this.away)
    }

    // Condition drain.
    for (const side of [this.home, this.away]) {
      const press = side.tactics.pressing === 'high' ? 1.3 : side.tactics.pressing === 'low' ? 0.8 : 1
      const tempo = side.tactics.tempo === 'fast' ? 1.15 : side.tactics.tempo === 'slow' ? 0.9 : 1
      for (const o of side.onPitch) {
        o.cond = Math.max(10, o.cond - 0.33 * press * tempo * (20 - o.player.attrs.physical * 0.5) / 12)
      }
    }

    if (m >= 90 + this.stoppage) {
      this.finished = true
      const total = this.home.possessionMinutes + this.away.possessionMinutes
      this.home.stats.possession = Math.round((100 * this.home.possessionMinutes) / total)
      this.away.stats.possession = 100 - this.home.stats.possession
      this.push(m, 'fulltime', 'none', `Full time: ${this.home.club.name} ${this.home.goals} - ${this.away.goals} ${this.away.club.name}.`)
      this.finalRatings()
    }
    return this.events.slice(before)
  }

  private recover(side: SideState, n: number) {
    for (const o of side.onPitch) o.cond = Math.min(100, o.cond + n)
  }

  private sendOff(side: SideState, offender: OnPitch, reason: string) {
    side.reds.push(offender.player.id)
    side.onPitch = side.onPitch.filter((o) => o !== offender)
    this.bump(side, offender.player.id, -1.5)
    this.push(this.minute, 'red', side.key, `RED CARD! ${offender.player.name} is sent off (${reason}). ${side.club.name} are down to ${side.onPitch.length}.`, offender.player.id)
  }

  private plannedSub(side: SideState) {
    if (side.subsUsed >= 3) return
    const tired = this.outfield(side)
      .filter((o) => o.cond < 62)
      .sort((a, b) => a.cond - b.cond)[0]
    if (tired) this.substitute(side, tired, false)
  }

  private substitute(side: SideState, out: OnPitch, forced: boolean) {
    if (side.subsUsed >= 3) {
      side.onPitch = side.onPitch.filter((o) => o !== out)
      if (forced) this.push(this.minute, 'info', side.key, `${side.club.short} have no substitutions left and must play on with ${side.onPitch.length}.`)
      return
    }
    const role = out.slot.role
    const candidates = side.bench
      .filter((p) => !side.played.has(p.id))
      .sort((a, b) => matchRating(b, role, b.condition) - matchRating(a, role, a.condition))
    const sub = candidates[0]
    if (!sub) {
      side.onPitch = side.onPitch.filter((o) => o !== out)
      return
    }
    side.subsUsed++
    side.played.add(sub.id)
    side.ratings.set(sub.id, 6.0)
    side.onPitch = side.onPitch.map((o) => (o === out ? { player: sub, slot: out.slot, cond: sub.condition, booked: false } : o))
    this.push(this.minute, 'sub', side.key, `Substitution for ${side.club.short}: ${sub.name} replaces ${out.player.name}.`, sub.id)
  }

  private openPlay(att: SideState, def: SideState, defS: ReturnType<MatchSim['strength']>, qualityMult: number, origin: 'open' | 'short' | 'edge', forcedShooter?: OnPitch) {
    const outfield = this.outfield(att)
    if (!outfield.length) return
    const shooter =
      forcedShooter ??
      weightedPick(this.rng, outfield, (o) => {
        const roleW = o.slot.role === 'FW' ? 3 : o.slot.role === 'MF' ? 1 : 0.2
        return roleW * Math.pow(o.player.attrs.shooting, 2)
      })
    const others = outfield.filter((o) => o !== shooter)
    const assister = others.length ? weightedPick(this.rng, others, (o) => Math.pow(o.player.attrs.passing, 2)) : null
    const quality =
      (shooter.player.attrs.shooting * 0.55 + shooter.player.attrs.dribbling * 0.2 + shooter.player.attrs.pace * 0.1 + (assister?.player.attrs.passing ?? 10) * 0.15) *
      (0.7 + 0.3 * (shooter.cond / 100)) *
      qualityMult
    att.stats.shots++
    const m = this.minute
    const blockP = clamp(0.22 * (defS.defence / Math.max(1, quality)), 0.08, 0.45)
    if (this.rng() < blockP) {
      const blocker = pick(this.rng, this.outfield(def))
      this.bump(def, blocker.player.id, 0.15)
      this.push(m, 'block', att.key, pick(this.rng, [
        `${shooter.player.name} shoots but ${blocker.player.name} throws himself in the way.`,
        `Blocked! ${blocker.player.name} gets a vital touch on ${shooter.player.name}'s effort.`,
        `${shooter.player.name} tries his luck and it's charged down by ${blocker.player.name}.`,
      ]), shooter.player.id)
      if (this.rng() < 0.35) this.corner(att, def, defS)
      return
    }
    const onTargetP = clamp(0.36 + (quality - 10) * 0.025, 0.2, 0.75)
    if (this.rng() > onTargetP) {
      this.push(m, 'miss', att.key, pick(this.rng, [
        `${shooter.player.name} drags it wide of the far post.`,
        `Over the bar from ${shooter.player.name}. The ${att.club.short} fans had their hands on their heads.`,
        `${shooter.player.name} snatches at it and it flies into the stands.`,
        `Good move from ${att.club.short} but ${shooter.player.name} can't keep the finish down.`,
      ]), shooter.player.id)
      this.bump(att, shooter.player.id, -0.05)
      return
    }
    att.stats.onTarget++
    const gk = this.keeper(def)
    const saveP = clamp(0.7 + (gk - quality) * 0.022 - (origin === 'edge' ? 0.05 : 0), 0.35, 0.92)
    const gkPlayer = def.onPitch.find((o) => o.slot.role === 'GK')
    if (this.rng() < saveP) {
      if (gkPlayer) this.bump(def, gkPlayer.player.id, 0.25)
      this.push(m, 'save', att.key, pick(this.rng, [
        `Saved! ${gkPlayer?.player.name ?? 'The keeper'} gets down well to keep out ${shooter.player.name}.`,
        `${shooter.player.name} forces a fine stop from ${gkPlayer?.player.name ?? 'the keeper'}.`,
        `Great strike from ${shooter.player.name}, matched by a great save.`,
      ]), shooter.player.id)
      if (this.rng() < 0.3) this.corner(att, def, defS)
      return
    }
    this.goal(att, def, shooter, assister, false, origin === 'open' ? pick(this.rng, [
      `GOAL! ${shooter.player.name} finishes${assister ? ` after a lovely ball from ${assister.player.name}` : ''}!`,
      `GOAL! ${shooter.player.name} drives it low into the corner! ${att.club.name} lead the celebrations.`,
      `GOAL for ${att.club.name}! ${shooter.player.name} makes no mistake${assister ? `, ${assister.player.name} with the assist` : ''}.`,
    ]) : origin === 'edge'
      ? `GOAL! Worked short from the corner and ${shooter.player.name} thumps it in from the edge of the box!`
      : `GOAL! The short routine opens them up and ${shooter.player.name} finishes!`)
  }

  private goal(att: SideState, def: SideState, scorer: OnPitch, assister: OnPitch | null, setPiece: boolean, text: string) {
    att.goals++
    if (setPiece) att.stats.setPieceGoals++
    att.scorers.push({ playerId: scorer.player.id, assistId: assister?.player.id, minute: this.minute, side: att.key, setPiece })
    this.bump(att, scorer.player.id, 1)
    if (assister) this.bump(att, assister.player.id, 0.5)
    const gk = def.onPitch.find((o) => o.slot.role === 'GK')
    if (gk) this.bump(def, gk.player.id, -0.2)
    for (const o of this.outfield(def)) if (o.slot.role === 'DF') this.bump(def, o.player.id, -0.1)
    this.push(this.minute, 'goal', att.key, `${text} ${this.home.club.short} ${this.home.goals} - ${this.away.goals} ${this.away.club.short}.`, scorer.player.id)
  }

  private corner(att: SideState, def: SideState, defS: ReturnType<MatchSim['strength']>) {
    att.stats.corners++
    const taker = this.taker(att, att.sp.cornerTaker)
    const routine: CornerRoutine = att.sp.cornerRoutine
    const m = this.minute
    const defHeading = this.outfield(def).reduce((s, o) => s + o.player.attrs.heading, 0) / Math.max(1, this.outfield(def).length)
    const marking = def.sp.marking

    if (routine === 'short') {
      this.push(m, 'corner', att.key, `Corner to ${att.club.short}. ${taker.player.name} plays it short.`, taker.player.id)
      if (this.rng() < 0.45) this.openPlay(att, def, defS, 0.85 * (marking === 'zonal' ? 0.92 : 1), 'short')
      else this.push(m, 'info', att.key, `${def.club.short} squeeze out the short corner and clear.`)
      return
    }
    if (routine === 'edge') {
      const shooter = this.outfield(att).filter((o) => o !== taker).sort((a, b) => b.player.attrs.shooting - a.player.attrs.shooting)[0]
      this.push(m, 'corner', att.key, `Corner to ${att.club.short}. ${taker.player.name} pulls it back to the edge of the area.`, taker.player.id)
      const connectP = clamp(0.3 + (taker.player.attrs.setPieces - 10) * 0.02 - (marking === 'zonal' ? 0.06 : 0), 0.1, 0.6)
      if (shooter && this.rng() < connectP) this.openPlay(att, def, defS, 1.05, 'edge', shooter)
      else this.push(m, 'info', att.key, `${def.club.short} get bodies in the way and the corner comes to nothing.`)
      return
    }

    // Near / far post delivery to the target man or best header.
    const target =
      this.findOnPitch(att, att.sp.targetMan && att.sp.targetMan !== taker.player.id ? att.sp.targetMan : null) ??
      this.outfield(att).filter((o) => o !== taker).sort((a, b) => b.player.attrs.heading - a.player.attrs.heading)[0]
    if (!target) return
    this.push(m, 'corner', att.key, `Corner to ${att.club.short}. ${taker.player.name} swings it towards the ${routine} post...`, taker.player.id)
    let p = 0.03 + (taker.player.attrs.setPieces - 10) * 0.0035 + (target.player.attrs.heading - 10) * 0.0045 - (defHeading - 10) * 0.003
    if (marking === 'man') p -= 0.009
    p = clamp(p, 0.008, 0.11)
    const winHeader = this.rng() < clamp(0.35 + (target.player.attrs.heading - defHeading) * 0.03 + (marking === 'man' ? -0.07 : 0), 0.1, 0.7)
    if (!winHeader) {
      this.push(m, 'info', att.key, `${def.club.short} head it clear.`)
      return
    }
    att.stats.shots++
    const gkName = def.onPitch.find((o) => o.slot.role === 'GK')?.player.name ?? 'the keeper'
    const r = this.rng()
    if (r < p) {
      this.goal(att, def, target, taker, true, `GOAL! ${target.player.name} rises highest and powers the header in from ${taker.player.name}'s corner!`)
    } else if (r < p + 0.3) {
      att.stats.onTarget++
      this.push(m, 'save', att.key, `${target.player.name} meets it but ${gkName} tips the header over!`, target.player.id)
    } else {
      this.push(m, 'miss', att.key, `${target.player.name} gets his head to it but it drifts wide.`, target.player.id)
    }
  }

  private freeKick(att: SideState, def: SideState, defS: ReturnType<MatchSim['strength']>) {
    const taker = this.taker(att, att.sp.freeKickTaker)
    const m = this.minute
    def.stats.fouls++
    const routine = att.sp.freeKickRoutine
    if (routine === 'short') {
      this.push(m, 'freekick', att.key, `Free kick to ${att.club.short} in a dangerous area. ${taker.player.name} plays it short.`, taker.player.id)
      if (this.rng() < 0.5) this.openPlay(att, def, defS, 0.9, 'short')
      else this.push(m, 'info', att.key, `${def.club.short} close it down quickly.`)
      return
    }
    if (routine === 'cross') {
      const target =
        this.findOnPitch(att, att.sp.targetMan && att.sp.targetMan !== taker.player.id ? att.sp.targetMan : null) ??
        this.outfield(att).filter((o) => o !== taker).sort((a, b) => b.player.attrs.heading - a.player.attrs.heading)[0]
      if (!target) return
      this.push(m, 'freekick', att.key, `Free kick to ${att.club.short}. ${taker.player.name} floats it into the box...`, taker.player.id)
      const defHeading = this.outfield(def).reduce((s, o) => s + o.player.attrs.heading, 0) / Math.max(1, this.outfield(def).length)
      let p = 0.028 + (taker.player.attrs.setPieces - 10) * 0.003 + (target.player.attrs.heading - 10) * 0.004 - (defHeading - 10) * 0.003 - (def.sp.marking === 'man' ? 0.008 : 0)
      p = clamp(p, 0.006, 0.1)
      att.stats.shots++
      const r = this.rng()
      if (r < p) this.goal(att, def, target, taker, true, `GOAL! ${target.player.name} glances ${taker.player.name}'s free kick into the net!`)
      else if (r < p + 0.25) {
        att.stats.onTarget++
        this.push(m, 'save', att.key, `${target.player.name}'s header is pushed away by the keeper.`, target.player.id)
      } else this.push(m, 'info', att.key, `${def.club.short} clear the free kick.`)
      return
    }
    // Direct.
    this.push(m, 'freekick', att.key, `Free kick to ${att.club.short}, ${taker.player.name} standing over it...`, taker.player.id)
    const gk = this.keeper(def)
    att.stats.shots++
    let p = 0.055 + (taker.player.attrs.setPieces - 10) * 0.007 + (taker.player.attrs.shooting - 10) * 0.003 - (gk - 10) * 0.004
    p = clamp(p, 0.015, 0.16)
    const r = this.rng()
    if (r < p) this.goal(att, def, taker, null, true, `GOAL! ${taker.player.name} curls the free kick over the wall and in! Unstoppable.`)
    else if (r < p + 0.3) {
      att.stats.onTarget++
      this.push(m, 'save', att.key, `${taker.player.name} bends it towards the top corner but the keeper claws it away!`, taker.player.id)
    } else if (r < p + 0.6) this.push(m, 'block', att.key, `${taker.player.name}'s free kick crashes into the wall.`, taker.player.id)
    else this.push(m, 'miss', att.key, `${taker.player.name} lifts the free kick just over.`, taker.player.id)
  }

  private penalty(att: SideState, def: SideState) {
    const taker = this.findOnPitch(att, att.sp.penaltyTaker) ?? this.outfield(att).sort((a, b) => penaltyScore(b.player) - penaltyScore(a.player))[0]
    if (!taker) return
    def.stats.fouls++
    const m = this.minute
    this.push(m, 'penalty', att.key, `PENALTY to ${att.club.short}! ${taker.player.name} will take it.`, taker.player.id)
    const gk = this.keeper(def)
    att.stats.shots++
    att.stats.onTarget++
    const p = clamp(0.74 + (taker.player.attrs.setPieces - 10) * 0.012 + (taker.player.attrs.shooting - 10) * 0.006 - (gk - 10) * 0.01, 0.5, 0.93)
    if (this.rng() < p) this.goal(att, def, taker, null, true, `GOAL! ${taker.player.name} sends the keeper the wrong way from the spot.`)
    else {
      const gkP = def.onPitch.find((o) => o.slot.role === 'GK')
      if (gkP) this.bump(def, gkP.player.id, 0.8)
      this.bump(att, taker.player.id, -0.6)
      this.push(m, 'save', att.key, `SAVED! ${gkP?.player.name ?? 'The keeper'} guesses right and ${taker.player.name}'s penalty is kept out!`, taker.player.id)
    }
  }

  private finalRatings() {
    const hw = this.home.goals > this.away.goals
    const aw = this.away.goals > this.home.goals
    for (const side of [this.home, this.away]) {
      const won = side === this.home ? hw : aw
      const lost = side === this.home ? aw : hw
      for (const [id, r] of side.ratings) {
        const adj = r + (won ? 0.4 : lost ? -0.4 : 0) + (this.rng() - 0.5) * 0.6
        side.ratings.set(id, clamp(Math.round(adj * 10) / 10, 3, 10))
      }
    }
  }

  /** Run the remainder of the match instantly. */
  runToEnd() {
    while (!this.finished) this.tick()
  }

  result(): MatchResult {
    const toResult = (side: SideState): SideResult => {
      const ratings = Object.fromEntries(side.ratings)
      let motm: string | null = null
      let best = -1
      for (const [id, r] of Object.entries(ratings)) {
        if (r > best) {
          best = r
          motm = id
        }
      }
      const minutesCondition: Record<string, number> = {}
      for (const o of side.onPitch) minutesCondition[o.player.id] = o.cond
      for (const id of side.played) if (!(id in minutesCondition)) minutesCondition[id] = 55
      return {
        clubId: side.club.id,
        goals: side.goals,
        stats: side.stats,
        scorers: side.scorers,
        ratings,
        played: [...side.played],
        minutesCondition,
        injuries: side.injuries,
        reds: side.reds,
        yellows: side.yellows,
        motm,
      }
    }
    return { home: toResult(this.home), away: toResult(this.away), events: this.events }
  }
}
