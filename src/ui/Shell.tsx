import { useState } from 'react'
import { CLUB_BY_ID } from '../data/clubs'
import type { MatchResult } from '../game/match'
import { finishWeek, myFixture, prepareWeek, startNewSeason } from '../game/season'
import { TOTAL_ROUNDS, type GameState } from '../game/types'
import { Crest } from './common'
import { FixturesView } from './FixturesView'
import { Home } from './Home'
import { MatchView } from './MatchView'
import { SeasonEnd } from './SeasonEnd'
import { SetPiecesEditor } from './SetPiecesEditor'
import { Squad } from './Squad'
import { TableView } from './TableView'
import { TacticsEditor } from './TacticsEditor'
import { TrainingView } from './TrainingView'

type View = 'home' | 'squad' | 'tactics' | 'training' | 'setpieces' | 'fixtures' | 'table'

const NAV: { key: View; label: string; icon: string }[] = [
  { key: 'home', label: 'Home', icon: '⌂' },
  { key: 'squad', label: 'Squad', icon: '👥' },
  { key: 'tactics', label: 'Tactics', icon: '◎' },
  { key: 'setpieces', label: 'Set Pieces', icon: '⚑' },
  { key: 'training', label: 'Training', icon: '⏱' },
  { key: 'fixtures', label: 'Fixtures', icon: '📅' },
  { key: 'table', label: 'League', icon: '☰' },
]

export function Shell({ game, update, onReset }: { game: GameState; update: (fn: (g: GameState) => void) => void; onReset: () => void }) {
  const [view, setView] = useState<View>('home')
  const club = CLUB_BY_ID[game.myClubId]
  const fixture = myFixture(game)
  const opp = fixture ? CLUB_BY_ID[fixture.homeId === game.myClubId ? fixture.awayId : fixture.homeId] : null

  const continueWeek = () => update((g) => prepareWeek(g))
  const onMatchFinished = (result: MatchResult) => {
    update((g) => finishWeek(g, result))
    setView('home')
  }

  let content
  if (game.phase === 'seasonEnd') content = <SeasonEnd game={game} onNewSeason={() => update((g) => startNewSeason(g))} />
  else if (game.phase === 'match') content = <MatchView key={`${game.season}-${game.round}`} game={game} update={update} onFinished={onMatchFinished} />
  else {
    switch (view) {
      case 'home':
        content = <Home game={game} onContinue={continueWeek} onNav={(v) => setView(v as View)} />
        break
      case 'squad':
        content = <Squad game={game} clubId={game.myClubId} />
        break
      case 'tactics':
        content = <TacticsEditor game={game} clubId={game.myClubId} onChange={(t) => update((g) => { g.tactics[g.myClubId] = t })} />
        break
      case 'setpieces':
        content = <SetPiecesEditor game={game} clubId={game.myClubId} onChange={(sp) => update((g) => { g.setPieces[g.myClubId] = sp })} />
        break
      case 'training':
        content = <TrainingView game={game} onChange={(t) => update((g) => { g.training = t })} />
        break
      case 'fixtures':
        content = <FixturesView game={game} />
        break
      case 'table':
        content = <TableView game={game} />
        break
    }
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="dot" /> Touchline
        </div>
        <nav className="nav">
          {NAV.map((n) => (
            <button type="button" key={n.key} className={view === n.key && game.phase === 'season' ? 'active' : ''} onClick={() => setView(n.key)} disabled={game.phase !== 'season'}>
              <span aria-hidden>{n.icon}</span> {n.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div>{game.managerName}</div>
          <div>Season {game.season}</div>
          <button
            type="button"
            className="btn sm secondary"
            style={{ marginTop: 8 }}
            onClick={() => {
              if (window.confirm('Delete this save and start a new career?')) onReset()
            }}
          >
            New career
          </button>
        </div>
      </aside>
      <main className="main">
        <div className="topbar">
          <div className="club">
            <Crest club={club} size={40} />
            <div>
              <div className="name">{club.name}</div>
              <div className="small muted">
                {game.phase === 'seasonEnd' ? `Season ${game.season} complete` : `Round ${Math.min(game.round, TOTAL_ROUNDS)} of ${TOTAL_ROUNDS}`}
                {opp && game.phase !== 'seasonEnd' ? ` · ${fixture?.homeId === game.myClubId ? 'v' : '@'} ${opp.name}` : ''}
              </div>
            </div>
          </div>
          {game.phase === 'season' && (
            <button type="button" className="btn" onClick={continueWeek}>
              Continue ▶
            </button>
          )}
        </div>
        {content}
      </main>
    </div>
  )
}
