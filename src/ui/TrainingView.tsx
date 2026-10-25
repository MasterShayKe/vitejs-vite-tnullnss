import { FOCUS_INFO } from '../game/season'
import { ATTR_LABEL, type GameState, type Intensity, type Training, type TrainingFocus } from '../game/types'
import { Seg } from './common'

const FOCI: TrainingFocus[] = ['attack', 'defence', 'technical', 'fitness', 'setpieces', 'rest']
const INTENSITIES: Intensity[] = ['light', 'medium', 'heavy']

export function TrainingView({ game, onChange }: { game: GameState; onChange: (t: Training) => void }) {
  const t = game.training
  const report = game.lastTrainingReport
  const grouped = report
    ? Object.values(
        report.changes.reduce<Record<string, { name: string; items: string[] }>>((acc, c) => {
          const p = game.players[c.playerId]
          if (!p) return acc
          const g = (acc[c.playerId] ??= { name: p.name, items: [] })
          g.items.push(`${ATTR_LABEL[c.attr]} ${c.delta > 0 ? '+' : ''}${c.delta.toFixed(1)}`)
          return acc
        }, {}),
      )
    : []

  return (
    <div className="grid2">
      <div className="stack">
        <div className="panel">
          <div className="panel-head">
            <h2>This week's focus</h2>
            <span className="chip on">Round {game.round}</span>
          </div>
          <div className="focus-grid">
            {FOCI.map((f) => (
              <button type="button" key={f} className={`focus-card ${t.focus === f ? 'selected' : ''}`} onClick={() => onChange({ ...t, focus: f })}>
                <div className="t">{FOCUS_INFO[f].title}</div>
                <div className="small muted">{FOCUS_INFO[f].blurb}</div>
              </button>
            ))}
          </div>
        </div>
        <div className="panel">
          <h2>Intensity</h2>
          <Seg value={t.intensity} options={INTENSITIES} onChange={(intensity) => onChange({ ...t, intensity })} />
          <p className="small muted" style={{ marginTop: 10 }}>
            {t.intensity === 'heavy' && 'Heavy sessions develop players fastest but cost match fitness and triple the injury risk. Use before easy fixtures.'}
            {t.intensity === 'medium' && 'A normal week. Steady development, full recovery for most players.'}
            {t.intensity === 'light' && 'Easy week. Slower development, but tired players recover extra condition.'}
          </p>
          <p className="small muted">
            Players under 24 improve quickly, prime-age players slowly, and veterans over 30 decline whatever you do. Nobody grows beyond their potential.
          </p>
        </div>
      </div>
      <div className="panel">
        <h2>Last session report</h2>
        {!report && <p className="muted">Training runs between matches. The first report appears once the opening fixture is played.</p>}
        {report && (
          <>
            <p className="small muted">
              Round {report.round}: {FOCUS_INFO[report.focus].title}, {report.intensity} intensity.
            </p>
            {report.injuries.length > 0 && (
              <p className="danger small">Injured in training: {report.injuries.map((id) => game.players[id]?.name).filter(Boolean).join(', ')}</p>
            )}
            {grouped.length === 0 && <p className="muted small">No measurable attribute changes this week.</p>}
            <div className="list" style={{ maxHeight: 520, overflowY: 'auto' }}>
              {grouped.map((g) => (
                <div key={g.name} className="item" style={{ justifyContent: 'space-between' }}>
                  <span>{g.name}</span>
                  <span className="small accent">{g.items.join(' · ')}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
