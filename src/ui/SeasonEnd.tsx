import { CLUB_BY_ID } from '../data/clubs'
import { clubPlayers } from '../game/ai'
import { leagueTable, ordinal, playerAvgRating, topScorers } from '../game/season'
import type { GameState } from '../game/types'
import { Crest } from './common'
import { TableView } from './TableView'

export function SeasonEnd({ game, onNewSeason }: { game: GameState; onNewSeason: () => void }) {
  const table = leagueTable(game)
  const champion = CLUB_BY_ID[table[0].clubId]
  const pos = table.findIndex((r) => r.clubId === game.myClubId) + 1
  const club = CLUB_BY_ID[game.myClubId]
  const goldenBoot = topScorers(game, 1)[0]
  const mySquad = clubPlayers(game, game.myClubId).filter((p) => p.stats.apps >= 10)
  const myBest = [...mySquad].sort((a, b) => playerAvgRating(b) - playerAvgRating(a))[0]
  const expected = club.tier
  const verdict =
    pos <= 1 ? 'Champions. The board is ecstatic.' : pos <= expected * 3 ? 'The board is pleased with your season.' : pos <= 17 ? 'The board expected more, but you keep your job.' : 'A season to forget. The board has grudgingly kept faith.'

  return (
    <div className="stack">
      <div className="panel center">
        <h1>Season {game.season} complete</h1>
        <div className="row" style={{ justifyContent: 'center', margin: '12px 0' }}>
          <Crest club={champion} size={48} />
          <span style={{ fontSize: 20, fontWeight: 700 }}>{champion.name} are champions</span>
        </div>
        <p>
          <strong>{club.name}</strong> finished <strong>{ordinal(pos)}</strong> with {table[pos - 1].points} points. {verdict}
        </p>
        <div className="grid3" style={{ marginTop: 16, textAlign: 'left' }}>
          {goldenBoot && (
            <div className="panel">
              <div className="small muted">Golden boot</div>
              <div style={{ fontWeight: 700 }}>{goldenBoot.name}</div>
              <div className="small muted">
                {CLUB_BY_ID[goldenBoot.clubId].name} · {goldenBoot.stats.goals} goals
              </div>
            </div>
          )}
          {myBest && (
            <div className="panel">
              <div className="small muted">Your player of the season</div>
              <div style={{ fontWeight: 700 }}>{myBest.name}</div>
              <div className="small muted">
                {playerAvgRating(myBest).toFixed(2)} avg rating · {myBest.stats.goals} goals
              </div>
            </div>
          )}
          <div className="panel">
            <div className="small muted">Previous seasons</div>
            {game.history.map((h) => (
              <div key={h.season} className="small">
                S{h.season}: {ordinal(h.position)} · {h.points} pts
              </div>
            ))}
          </div>
        </div>
        <button type="button" className="btn lg" style={{ marginTop: 20 }} onClick={onNewSeason}>
          Start season {game.season + 1}
        </button>
        <p className="small muted" style={{ marginTop: 8 }}>
          Players age a year, veterans retire, youth players step up, and a new fixture list is drawn.
        </p>
      </div>
      <TableView game={game} />
    </div>
  )
}
