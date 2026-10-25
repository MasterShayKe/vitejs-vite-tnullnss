export type Role = 'GK' | 'DF' | 'MF' | 'FW'

export type AttrKey =
  | 'pace'
  | 'shooting'
  | 'passing'
  | 'dribbling'
  | 'defending'
  | 'heading'
  | 'physical'
  | 'setPieces'
  | 'goalkeeping'

export const ATTR_KEYS: AttrKey[] = [
  'pace',
  'shooting',
  'passing',
  'dribbling',
  'defending',
  'heading',
  'physical',
  'setPieces',
  'goalkeeping',
]

export const ATTR_LABEL: Record<AttrKey, string> = {
  pace: 'Pace',
  shooting: 'Shooting',
  passing: 'Passing',
  dribbling: 'Dribbling',
  defending: 'Defending',
  heading: 'Heading',
  physical: 'Physical',
  setPieces: 'Set Pieces',
  goalkeeping: 'Goalkeeping',
}

export const ATTR_SHORT: Record<AttrKey, string> = {
  pace: 'PAC',
  shooting: 'SHO',
  passing: 'PAS',
  dribbling: 'DRI',
  defending: 'DEF',
  heading: 'HEA',
  physical: 'PHY',
  setPieces: 'SPC',
  goalkeeping: 'GK',
}

export type Attrs = Record<AttrKey, number>

export interface SeasonStats {
  apps: number
  goals: number
  assists: number
  ratingSum: number
  motm: number
  setPieceGoals: number
}

export interface Player {
  id: string
  name: string
  age: number
  role: Role
  clubId: string
  attrs: Attrs
  potential: number
  condition: number
  morale: number
  injuryWeeks: number
  suspended: number
  yellows: number
  stats: SeasonStats
}

export interface Club {
  id: string
  name: string
  short: string
  city: string
  stadium: string
  primary: string
  secondary: string
  tier: number
}

export type FormationKey = '4-4-2' | '4-3-3' | '4-2-3-1' | '3-5-2' | '5-3-2' | '4-1-4-1'

export type Mentality = 'defensive' | 'cautious' | 'balanced' | 'positive' | 'attacking'
export type Width = 'narrow' | 'normal' | 'wide'
export type Tempo = 'slow' | 'normal' | 'fast'
export type Pressing = 'low' | 'medium' | 'high'

export interface Tactics {
  formation: FormationKey
  mentality: Mentality
  width: Width
  tempo: Tempo
  pressing: Pressing
  lineup: (string | null)[]
  bench: string[]
}

export type CornerRoutine = 'near' | 'far' | 'short' | 'edge'
export type FreeKickRoutine = 'direct' | 'cross' | 'short'
export type Marking = 'zonal' | 'man'

export interface SetPieces {
  cornerTaker: string | null
  freeKickTaker: string | null
  penaltyTaker: string | null
  targetMan: string | null
  cornerRoutine: CornerRoutine
  freeKickRoutine: FreeKickRoutine
  marking: Marking
}

export type TrainingFocus = 'attack' | 'defence' | 'technical' | 'fitness' | 'setpieces' | 'rest'
export type Intensity = 'light' | 'medium' | 'heavy'

export interface Training {
  focus: TrainingFocus
  intensity: Intensity
}

export type EventType =
  | 'kickoff'
  | 'goal'
  | 'chance'
  | 'save'
  | 'miss'
  | 'block'
  | 'corner'
  | 'freekick'
  | 'penalty'
  | 'yellow'
  | 'red'
  | 'injury'
  | 'sub'
  | 'halftime'
  | 'fulltime'
  | 'info'

export type SideKey = 'home' | 'away'

export interface MatchEvent {
  id: number
  minute: number
  type: EventType
  side: SideKey | 'none'
  text: string
  playerId?: string
}

export interface MatchStats {
  possession: number
  shots: number
  onTarget: number
  corners: number
  fouls: number
  setPieceGoals: number
}

export interface Scorer {
  playerId: string
  assistId?: string
  minute: number
  side: SideKey
  setPiece: boolean
}

export interface Fixture {
  id: string
  round: number
  homeId: string
  awayId: string
  played: boolean
  homeGoals: number
  awayGoals: number
  scorers: Scorer[]
}

export type NewsKind = 'result' | 'injury' | 'training' | 'info' | 'award'

export interface NewsItem {
  id: string
  round: number
  kind: NewsKind
  title: string
  body: string
}

export interface TrainingChange {
  playerId: string
  attr: AttrKey
  delta: number
}

export interface TrainingReport {
  round: number
  focus: TrainingFocus
  intensity: Intensity
  changes: TrainingChange[]
  injuries: string[]
}

export interface SeasonRecord {
  season: number
  position: number
  champion: string
  points: number
}

export type Phase = 'season' | 'match' | 'seasonEnd'

export interface GameState {
  version: 1
  seed: number
  rngState: number
  season: number
  round: number
  phase: Phase
  managerName: string
  myClubId: string
  rivalMode: boolean
  rivalName: string
  clubs: Club[]
  players: Record<string, Player>
  fixtures: Fixture[]
  tactics: Record<string, Tactics>
  setPieces: Record<string, SetPieces>
  training: Training
  news: NewsItem[]
  lastTrainingReport: TrainingReport | null
  history: SeasonRecord[]
}

export const TOTAL_ROUNDS = 38
