import { CLUB_BY_ID } from '../data/clubs'
import { leagueTable, topScorers } from '../game/season'
import type { GameState } from '../game/types'
import { Crest } from './common'

export function TableView({ game }: { game: GameState }) {
  const table = leagueTable(game)
  const scorers = topScorers(game, 10)
  return (
    <div className="grid2" style={{ gridTemplateColumns: '2fr 1fr' }}>
      <div className="panel">
        <h2>League table</h2>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th className="num">#</th>
                <th>Club</th>
                <th className="num">P</th>
                <th className="num">W</th>
                <th className="num">D</th>
                <th className="num">L</th>
                <th className="num">GF</th>
                <th className="num">GA</th>
                <th className="num">GD</th>
                <th className="num">Pts</th>
                <th>Form</th>
              </tr>
            </thead>
            <tbody>
              {table.map((r, i) => {
                const club = CLUB_BY_ID[r.clubId]
                return (
                  <tr key={r.clubId} className={r.clubId === game.myClubId ? 'mine' : ''}>
                    <td className="num muted">{i + 1}</td>
                    <td>
                      <span className="row" style={{ gap: 8 }}>
                        <Crest club={club} size={22} /> {club.name}
                      </span>
                    </td>
                    <td className="num">{r.played}</td>
                    <td className="num">{r.won}</td>
                    <td className="num">{r.drawn}</td>
                    <td className="num">{r.lost}</td>
                    <td className="num">{r.gf}</td>
                    <td className="num">{r.ga}</td>
                    <td className="num">{r.gd > 0 ? `+${r.gd}` : r.gd}</td>
                    <td className="num" style={{ fontWeight: 700 }}>
                      {r.points}
                    </td>
                    <td>
                      <span className="form">
                        {r.form.map((x, j) => (
                          <span key={j} className={x}>
                            {x}
                          </span>
                        ))}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
      <div className="panel">
        <h2>Top scorers</h2>
        <div className="list">
          {scorers.map((p, i) => (
            <div key={p.id} className="item">
              <span className="muted small" style={{ width: 18 }}>
                {i + 1}
              </span>
              <Crest club={CLUB_BY_ID[p.clubId]} size={20} />
              <span style={{ flex: 1 }} className={p.clubId === game.myClubId ? 'accent' : ''}>
                {p.name}
              </span>
              <span className="mono" style={{ fontWeight: 700 }}>
                {p.stats.goals}
              </span>
              <span className="muted small mono">{p.stats.assists}a</span>
            </div>
          ))}
          {!scorers.length && <div className="muted small">No goals yet.</div>}
        </div>
      </div>
    </div>
  )
}
