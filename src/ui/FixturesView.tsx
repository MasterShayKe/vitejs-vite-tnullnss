import { useState } from 'react'
import { CLUB_BY_ID } from '../data/clubs'
import { TOTAL_ROUNDS, type Fixture, type GameState } from '../game/types'
import { Crest } from './common'

function Score({ f, mine }: { f: Fixture; mine?: string }) {
  const home = CLUB_BY_ID[f.homeId]
  const away = CLUB_BY_ID[f.awayId]
  const myHome = mine === f.homeId
  const myAway = mine === f.awayId
  let cls = ''
  if (f.played && (myHome || myAway)) {
    const gf = myHome ? f.homeGoals : f.awayGoals
    const ga = myHome ? f.awayGoals : f.homeGoals
    cls = gf > ga ? 'accent' : gf < ga ? 'danger' : 'muted'
  }
  return (
    <div className="item" style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center' }}>
      <span className="row" style={{ justifyContent: 'flex-end', fontWeight: myHome ? 700 : 400 }}>
        {home.name} <Crest club={home} size={22} />
      </span>
      <span className={`mono center ${cls}`} style={{ minWidth: 70, fontWeight: 700 }}>
        {f.played ? `${f.homeGoals} - ${f.awayGoals}` : 'v'}
      </span>
      <span className="row" style={{ fontWeight: myAway ? 700 : 400 }}>
        <Crest club={away} size={22} /> {away.name}
      </span>
    </div>
  )
}

export function FixturesView({ game }: { game: GameState }) {
  const [round, setRound] = useState(Math.min(game.round, TOTAL_ROUNDS))
  const mine = game.fixtures.filter((f) => f.homeId === game.myClubId || f.awayId === game.myClubId)
  const roundFixtures = game.fixtures.filter((f) => f.round === round)
  const scorersFor = (f: Fixture) =>
    f.scorers
      .map((s) => `${game.players[s.playerId]?.name ?? '?'} ${s.minute}'${s.setPiece ? ' (sp)' : ''}`)
      .join(', ')

  return (
    <div className="grid2">
      <div className="panel">
        <h2>Your fixtures</h2>
        <div className="list" style={{ maxHeight: 640, overflowY: 'auto' }}>
          {mine.map((f) => (
            <div key={f.id} style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="small muted" style={{ padding: '6px 6px 0' }}>
                Round {f.round} · {f.homeId === game.myClubId ? 'Home' : 'Away'}
              </div>
              <Score f={f} mine={game.myClubId} />
              {f.played && f.scorers.length > 0 && (
                <div className="small muted" style={{ padding: '0 6px 8px' }}>
                  {scorersFor(f)}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="panel">
        <div className="panel-head">
          <h2>Round {round}</h2>
          <div className="row">
            <button type="button" className="btn sm secondary" disabled={round <= 1} onClick={() => setRound(round - 1)}>
              ◀
            </button>
            <select value={round} onChange={(e) => setRound(Number(e.target.value))}>
              {Array.from({ length: TOTAL_ROUNDS }, (_, i) => i + 1).map((r) => (
                <option key={r} value={r}>
                  Round {r}
                </option>
              ))}
            </select>
            <button type="button" className="btn sm secondary" disabled={round >= TOTAL_ROUNDS} onClick={() => setRound(round + 1)}>
              ▶
            </button>
          </div>
        </div>
        <div className="list">
          {roundFixtures.map((f) => (
            <Score key={f.id} f={f} mine={game.myClubId} />
          ))}
        </div>
      </div>
    </div>
  )
}
