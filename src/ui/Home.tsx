import { CLUB_BY_ID } from '../data/clubs'
import { clubPlayers } from '../game/ai'
import { FOCUS_INFO, leagueTable, myFixture, ordinal } from '../game/season'
import { TOTAL_ROUNDS, type GameState } from '../game/types'
import { Crest, Status } from './common'

export function Home({ game, onContinue, onNav }: { game: GameState; onContinue: () => void; onNav: (v: string) => void }) {
  const club = CLUB_BY_ID[game.myClubId]
  const fixture = myFixture(game)
  const table = leagueTable(game)
  const pos = table.findIndex((r) => r.clubId === game.myClubId) + 1
  const row = table[pos - 1]
  const squad = clubPlayers(game, game.myClubId)
  const unavailable = squad.filter((p) => p.injuryWeeks > 0 || p.suspended > 0)
  const scorer = [...squad].sort((a, b) => b.stats.goals - a.stats.goals)[0]
  const opp = fixture ? CLUB_BY_ID[fixture.homeId === game.myClubId ? fixture.awayId : fixture.homeId] : null
  const oppRow = opp ? table.find((r) => r.clubId === opp.id) : null
  const oppPos = opp ? table.findIndex((r) => r.clubId === opp.id) + 1 : 0
  const tactics = game.tactics[game.myClubId]
  const emptySlots = tactics.lineup.filter((x) => !x).length

  return (
    <div className="grid2">
      <div className="stack">
        {fixture && opp && (
          <div className="panel">
            <div className="panel-head">
              <h2>Next match · Round {game.round} of {TOTAL_ROUNDS}</h2>
              <span className="muted small">{fixture.homeId === game.myClubId ? club.stadium : opp.stadium}</span>
            </div>
            <div className="scoreboard" style={{ padding: 14 }}>
              <div className="team">
                <Crest club={CLUB_BY_ID[fixture.homeId]} size={36} />
                <span>{CLUB_BY_ID[fixture.homeId].name}</span>
              </div>
              <div className="muted">v</div>
              <div className="team away">
                <span>{CLUB_BY_ID[fixture.awayId].name}</span>
                <Crest club={CLUB_BY_ID[fixture.awayId]} size={36} />
              </div>
            </div>
            <div className="row" style={{ justifyContent: 'space-between', marginTop: 12 }}>
              <span className="small muted">
                {opp.name} are {ordinal(oppPos)}
                {oppRow && oppRow.form.length ? ` · form ${oppRow.form.join('')}` : ''} · plays {game.tactics[opp.id].formation}
              </span>
              <button type="button" className="btn" onClick={onContinue}>
                Continue to match day ▶
              </button>
            </div>
            {emptySlots > 0 && (
              <p className="danger small" style={{ marginTop: 8 }}>
                Your lineup has {emptySlots} empty slot{emptySlots > 1 ? 's' : ''}. The assistant will fill them, or set them in Tactics.
              </p>
            )}
          </div>
        )}

        <div className="grid3">
          <div className="panel clickable" onClick={() => onNav('table')} style={{ cursor: 'pointer' }}>
            <div className="small muted">League position</div>
            <div className="big-stat">{row.played ? ordinal(pos) : '-'}</div>
            <div className="small muted">
              {row.points} pts · {row.played} played
            </div>
          </div>
          <div className="panel" onClick={() => onNav('training')} style={{ cursor: 'pointer' }}>
            <div className="small muted">Training</div>
            <div style={{ fontWeight: 700, fontSize: 18 }}>{FOCUS_INFO[game.training.focus].title}</div>
            <div className="small muted" style={{ textTransform: 'capitalize' }}>
              {game.training.intensity} intensity
            </div>
          </div>
          <div className="panel" onClick={() => onNav('tactics')} style={{ cursor: 'pointer' }}>
            <div className="small muted">Tactics</div>
            <div style={{ fontWeight: 700, fontSize: 18 }}>{tactics.formation}</div>
            <div className="small muted" style={{ textTransform: 'capitalize' }}>
              {tactics.mentality} · {tactics.pressing} press
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h2>Squad status</h2>
            <button type="button" className="btn sm secondary" onClick={() => onNav('squad')}>
              Full squad
            </button>
          </div>
          {scorer && scorer.stats.goals > 0 && (
            <p className="small">
              Top scorer: <strong>{scorer.name}</strong> with {scorer.stats.goals} goal{scorer.stats.goals === 1 ? '' : 's'}.
            </p>
          )}
          {unavailable.length === 0 && <p className="muted small">Everyone is fit and available.</p>}
          <div className="list">
            {unavailable.map((p) => (
              <div key={p.id} className="item">
                <span style={{ flex: 1 }}>{p.name}</span>
                <Status p={p} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="panel">
        <h2>Inbox</h2>
        <div className="list news" style={{ maxHeight: 640, overflowY: 'auto' }}>
          {game.news.map((n) => (
            <div key={n.id} className="item">
              <div className="row" style={{ gap: 8 }}>
                <span className={`chip ${n.kind === 'result' ? 'on' : n.kind === 'injury' ? 'red' : n.kind === 'award' ? 'amber' : ''}`}>{n.kind}</span>
                <span className="small muted">Round {n.round}</span>
              </div>
              <div className="title">{n.title}</div>
              {n.body && <div className="small muted">{n.body}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
