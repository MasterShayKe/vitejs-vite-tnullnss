import { useEffect, useRef, useState } from 'react'
import { CLUB_BY_ID } from '../data/clubs'
import { FORMATIONS } from '../game/formations'
import type { MatchResult, MatchSim } from '../game/match'
import { createMatch, myFixture } from '../game/season'
import type { Fixture, GameState, Mentality, SetPieces, SideKey, Tactics } from '../game/types'
import { Crest, Seg, shortName } from './common'
import { SetPiecesEditor } from './SetPiecesEditor'
import { TacticsEditor } from './TacticsEditor'

type Stage = 'rival' | 'pre' | 'live' | 'post'
type Speed = 'slow' | 'normal' | 'fast'
const SPEED_MS: Record<Speed, number> = { slow: 900, normal: 320, fast: 70 }
const MENTALITIES: Mentality[] = ['defensive', 'cautious', 'balanced', 'positive', 'attacking']

export function MatchView({
  game,
  update,
  onFinished,
}: {
  game: GameState
  update: (fn: (g: GameState) => void) => void
  onFinished: (result: MatchResult) => void
}) {
  const fixture = myFixture(game)
  const [stage, setStage] = useState<Stage>(game.rivalMode ? 'rival' : 'pre')
  const simRef = useRef<MatchSim | null>(null)
  const [, force] = useState(0)
  const [speed, setSpeed] = useState<Speed>('normal')
  const [paused, setPaused] = useState(false)
  const feedRef = useRef<HTMLDivElement>(null)

  const sim = simRef.current
  const running = stage === 'live' && !paused && sim !== null && !sim.finished

  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => {
      const s = simRef.current
      if (!s) return
      s.tick()
      force((n) => n + 1)
      if (s.finished) setStage('post')
    }, SPEED_MS[speed])
    return () => window.clearInterval(id)
  }, [running, speed])

  useEffect(() => {
    const el = feedRef.current
    if (el) el.scrollTop = el.scrollHeight
  })

  if (!fixture) return <div className="panel">No fixture this week.</div>

  const myKey: SideKey = fixture.homeId === game.myClubId ? 'home' : 'away'
  const oppId = myKey === 'home' ? fixture.awayId : fixture.homeId
  const home = CLUB_BY_ID[fixture.homeId]
  const away = CLUB_BY_ID[fixture.awayId]

  const kickOff = () => {
    simRef.current = createMatch(game, fixture)
    setPaused(false)
    setStage('live')
  }

  const skip = () => {
    const s = simRef.current
    if (!s) return
    s.runToEnd()
    force((n) => n + 1)
    setStage('post')
  }

  if (stage === 'rival') {
    return <RivalStage game={game} update={update} oppId={oppId} onReady={() => setStage('pre')} />
  }

  if (stage === 'pre') {
    return (
      <div className="stack">
        <div className="scoreboard">
          <div className="team">
            <Crest club={home} size={40} />
            <span>{home.name}</span>
          </div>
          <div className="center">
            <div className="muted">Round {fixture.round}</div>
            <div className="small muted">{home.stadium}</div>
          </div>
          <div className="team away">
            <span>{away.name}</span>
            <Crest club={away} size={40} />
          </div>
        </div>
        <div className="grid2">
          <LineupPanel game={game} clubId={fixture.homeId} />
          <LineupPanel game={game} clubId={fixture.awayId} />
        </div>
        <div className="row" style={{ justifyContent: 'center' }}>
          <button type="button" className="btn lg" onClick={kickOff}>
            Kick off
          </button>
        </div>
        <p className="center small muted">You can change mentality during the match. Substitutions are handled by your assistant.</p>
      </div>
    )
  }

  if (!sim) return null
  const hs = sim.home.stats
  const as = sim.away.stats
  const minuteLabel = sim.finished ? 'FT' : sim.minute > 90 ? `90+${sim.minute - 90}'` : sim.minute === 45 && !sim.finished ? "45'" : `${sim.minute}'`

  return (
    <div className="stack">
      <div className="scoreboard">
        <div className="team">
          <Crest club={home} size={40} />
          <span>{home.name}</span>
        </div>
        <div className="center">
          <div className="score">
            {sim.score.home} - {sim.score.away}
          </div>
          <div className="minute">{minuteLabel}</div>
        </div>
        <div className="team away">
          <span>{away.name}</span>
          <Crest club={away} size={40} />
        </div>
      </div>
      <div className="scorers">
        <div>
          {sim.home.scorers.map((s, i) => (
            <div key={i}>
              {shortName(game.players[s.playerId]?.name ?? '')} {s.minute}'{s.setPiece ? ' (sp)' : ''}
            </div>
          ))}
        </div>
        <div>
          {sim.away.scorers.map((s, i) => (
            <div key={i}>
              {shortName(game.players[s.playerId]?.name ?? '')} {s.minute}'{s.setPiece ? ' (sp)' : ''}
            </div>
          ))}
        </div>
      </div>

      <div className="grid2" style={{ gridTemplateColumns: '3fr 2fr' }}>
        <div className="panel">
          <div className="panel-head">
            <h2>Commentary</h2>
            {stage === 'live' && (
              <div className="row">
                <Seg value={speed} options={['slow', 'normal', 'fast'] as const} onChange={setSpeed} />
                <button type="button" className="btn sm secondary" onClick={() => setPaused(!paused)}>
                  {paused ? 'Resume' : 'Pause'}
                </button>
                <button type="button" className="btn sm secondary" onClick={skip}>
                  Skip to FT
                </button>
              </div>
            )}
          </div>
          <div className="commentary" ref={feedRef}>
            {sim.events.map((e) => (
              <div key={e.id} className={`ev ${e.type}`}>
                <span className="min">{e.minute > 90 ? `90+${e.minute - 90}` : e.minute}'</span>
                <span>{e.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="stack">
          <div className="panel">
            <h2>Match stats</h2>
            <StatRow label="Possession" a={hs.possession || sim.home.possessionMinutes} b={as.possession || sim.away.possessionMinutes} pct />
            <StatRow label="Shots" a={hs.shots} b={as.shots} />
            <StatRow label="On target" a={hs.onTarget} b={as.onTarget} />
            <StatRow label="Corners" a={hs.corners} b={as.corners} />
            <StatRow label="Fouls" a={hs.fouls} b={as.fouls} />
            <StatRow label="SP goals" a={hs.setPieceGoals} b={as.setPieceGoals} />
          </div>

          {stage === 'live' && (
            <div className="panel">
              <h2>Touchline</h2>
              <label className="field">
                {CLUB_BY_ID[game.myClubId].short} mentality
                <Seg value={sim.side(myKey).tactics.mentality} options={MENTALITIES} onChange={(m) => { sim.setMentality(myKey, m); force((n) => n + 1) }} />
              </label>
              {game.rivalMode && (
                <label className="field" style={{ marginTop: 10 }}>
                  {CLUB_BY_ID[oppId].short} mentality ({game.rivalName})
                  <Seg
                    value={sim.side(myKey === 'home' ? 'away' : 'home').tactics.mentality}
                    options={MENTALITIES}
                    onChange={(m) => { sim.setMentality(myKey === 'home' ? 'away' : 'home', m); force((n) => n + 1) }}
                  />
                </label>
              )}
            </div>
          )}

          {stage === 'post' && (
            <div className="panel">
              <h2>Full time</h2>
              <PostSummary sim={sim} game={game} />
              <button type="button" className="btn lg" style={{ width: '100%', marginTop: 12 }} onClick={() => onFinished(sim.result())}>
                Continue
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatRow({ label, a, b, pct }: { label: string; a: number; b: number; pct?: boolean }) {
  const total = a + b || 1
  return (
    <div className="stat-row">
      <span className="mono right">{pct ? `${Math.round((100 * a) / total)}%` : a}</span>
      <div>
        <div className="label">{label}</div>
        <div className="bars">
          <div>
            <span style={{ width: `${(100 * a) / total}%` }} />
          </div>
          <div>
            <span style={{ width: `${(100 * b) / total}%` }} />
          </div>
        </div>
      </div>
      <span className="mono">{pct ? `${Math.round((100 * b) / total)}%` : b}</span>
    </div>
  )
}

function PostSummary({ sim, game }: { sim: MatchSim; game: GameState }) {
  const res = sim.result()
  const mine = res.home.clubId === game.myClubId ? res.home : res.away
  const motm = [res.home, res.away]
    .flatMap((s) => Object.entries(s.ratings))
    .sort((x, y) => y[1] - x[1])[0]
  const best = [...Object.entries(mine.ratings)].sort((x, y) => y[1] - x[1]).slice(0, 3)
  return (
    <div className="stack small">
      {motm && (
        <div>
          Player of the match: <strong>{game.players[motm[0]]?.name}</strong> ({motm[1].toFixed(1)})
        </div>
      )}
      <div className="muted">Your best performers</div>
      <div className="list">
        {best.map(([id, r]) => (
          <div key={id} className="item" style={{ justifyContent: 'space-between' }}>
            <span>{game.players[id]?.name}</span>
            <span className="mono accent">{r.toFixed(1)}</span>
          </div>
        ))}
      </div>
      {mine.injuries.length > 0 && <div className="danger">Injuries: {mine.injuries.map((i) => `${game.players[i.playerId]?.name} (${i.weeks}w)`).join(', ')}</div>}
      {mine.reds.length > 0 && <div className="danger">Sent off: {mine.reds.map((id) => game.players[id]?.name).join(', ')}</div>}
    </div>
  )
}

function LineupPanel({ game, clubId }: { game: GameState; clubId: string }) {
  const club = CLUB_BY_ID[clubId]
  const t = game.tactics[clubId]
  const slots = FORMATIONS[t.formation]
  const sp = game.setPieces[clubId]
  return (
    <div className="panel">
      <div className="panel-head">
        <span className="row">
          <Crest club={club} size={24} /> <strong>{club.name}</strong>
        </span>
        <span className="chip">{t.formation} · {t.mentality}</span>
      </div>
      <div className="list small">
        {t.lineup.map((id, i) => {
          const p = id ? game.players[id] : null
          return (
            <div key={i} className="item" style={{ padding: '4px 6px' }}>
              <span className="muted" style={{ width: 34 }}>
                {slots[i].label}
              </span>
              <span>{p ? p.name : '-'}</span>
            </div>
          )
        })}
      </div>
      <div className="small muted" style={{ marginTop: 8 }}>
        Corners: {sp.cornerTaker ? shortName(game.players[sp.cornerTaker]?.name ?? '') : 'auto'} ({sp.cornerRoutine}) · FKs:{' '}
        {sp.freeKickTaker ? shortName(game.players[sp.freeKickTaker]?.name ?? '') : 'auto'} ({sp.freeKickRoutine}) · Pens:{' '}
        {sp.penaltyTaker ? shortName(game.players[sp.penaltyTaker]?.name ?? '') : 'auto'}
      </div>
    </div>
  )
}

function RivalStage({ game, update, oppId, onReady }: { game: GameState; update: (fn: (g: GameState) => void) => void; oppId: string; onReady: () => void }) {
  const [tab, setTab] = useState<'tactics' | 'setpieces'>('tactics')
  const opp = CLUB_BY_ID[oppId]
  const fixture = myFixture(game) as Fixture
  const atHome = fixture.homeId === oppId
  return (
    <div className="stack">
      <div className="rival-banner">
        <h1>Pass the device to {game.rivalName}</h1>
        <p className="muted">
          {game.rivalName} manages <strong>{opp.name}</strong> {atHome ? 'at home' : 'away'} against {CLUB_BY_ID[game.myClubId].name} this week. Set the lineup, instructions and set pieces, then hand it back.
        </p>
        <button type="button" className="btn lg" onClick={onReady}>
          {opp.short} are ready
        </button>
      </div>
      <div className="tabs">
        <button type="button" className={tab === 'tactics' ? 'active' : ''} onClick={() => setTab('tactics')}>
          Tactics
        </button>
        <button type="button" className={tab === 'setpieces' ? 'active' : ''} onClick={() => setTab('setpieces')}>
          Set pieces
        </button>
      </div>
      {tab === 'tactics' ? (
        <TacticsEditor game={game} clubId={oppId} onChange={(t: Tactics) => update((g) => { g.tactics[oppId] = t })} />
      ) : (
        <SetPiecesEditor game={game} clubId={oppId} onChange={(sp: SetPieces) => update((g) => { g.setPieces[oppId] = sp })} />
      )}
    </div>
  )
}
