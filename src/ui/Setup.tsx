import { useState } from 'react'
import { CLUBS } from '../data/clubs'
import type { NewGameOptions } from '../game/generate'
import { Crest, Stars } from './common'

export function Setup({ onStart }: { onStart: (opts: NewGameOptions) => void }) {
  const [managerName, setManagerName] = useState('')
  const [clubId, setClubId] = useState<string | null>(null)
  const [rivalMode, setRivalMode] = useState(false)
  const [rivalName, setRivalName] = useState('')

  return (
    <div className="setup">
      <div className="hero">
        <h1>Touchline Manager</h1>
        <p className="muted">Pick your club, follow every fixture, and out-think the opposition from the dugout.</p>
      </div>

      <div className="panel">
        <div className="grid2">
          <label className="field">
            Manager name
            <input type="text" value={managerName} onChange={(e) => setManagerName(e.target.value)} placeholder="Your name" />
          </label>
          <div className="field">
            <span>Rival mode</span>
            <div className="row">
              <button type="button" className={`btn sm ${rivalMode ? '' : 'secondary'}`} onClick={() => setRivalMode(true)}>
                On
              </button>
              <button type="button" className={`btn sm ${rivalMode ? 'secondary' : ''}`} onClick={() => setRivalMode(false)}>
                Off
              </button>
              {rivalMode && (
                <input type="text" value={rivalName} onChange={(e) => setRivalName(e.target.value)} placeholder="Rival's name" style={{ flex: 1, minWidth: 140 }} />
              )}
            </div>
            <span className="small muted">
              With rival mode on, a friend sets the opposition's tactics and set pieces before every match. Off, and the AI manages them.
            </span>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>Choose your club</h2>
          <span className="muted small">Stars show squad quality. Fewer stars, bigger challenge.</span>
        </div>
        <div className="club-grid">
          {CLUBS.map((c) => (
            <button type="button" key={c.id} className={`club-card ${clubId === c.id ? 'selected' : ''}`} onClick={() => setClubId(c.id)}>
              <Crest club={c} size={36} />
              <div>
                <div style={{ fontWeight: 700 }}>{c.name}</div>
                <div className="small muted">{c.stadium}</div>
                <Stars tier={c.tier} />
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
        <button
          type="button"
          className="btn lg"
          disabled={!clubId}
          onClick={() => clubId && onStart({ managerName: managerName.trim(), myClubId: clubId, rivalMode, rivalName: rivalName.trim() })}
        >
          Take the job
        </button>
      </div>
    </div>
  )
}
