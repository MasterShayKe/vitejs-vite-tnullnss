import { useState } from 'react'
import { CLUB_BY_ID } from '../data/clubs'
import { autoPickLineup, clubPlayers, pickBench } from '../game/ai'
import { FORMATIONS, FORMATION_KEYS } from '../game/formations'
import { isAvailable, matchRating } from '../game/rating'
import type { FormationKey, GameState, Mentality, Pressing, Tactics, Tempo, Width } from '../game/types'
import { Attr, Pitch, RoleTag, Seg, Status } from './common'

const MENTALITIES: Mentality[] = ['defensive', 'cautious', 'balanced', 'positive', 'attacking']
const WIDTHS: Width[] = ['narrow', 'normal', 'wide']
const TEMPOS: Tempo[] = ['slow', 'normal', 'fast']
const PRESSINGS: Pressing[] = ['low', 'medium', 'high']

export function TacticsEditor({ game, clubId, onChange }: { game: GameState; clubId: string; onChange: (t: Tactics) => void }) {
  const tactics = game.tactics[clubId]
  const club = CLUB_BY_ID[clubId]
  const [selected, setSelected] = useState<number | null>(null)
  const slots = FORMATIONS[tactics.formation]
  const squad = clubPlayers(game, clubId)

  const setFormation = (formation: FormationKey) => {
    const newSlots = FORMATIONS[formation]
    // Keep players where roles line up, re-pick the rest.
    const lineup: (string | null)[] = new Array(newSlots.length).fill(null)
    const remaining = tactics.lineup.filter((id): id is string => !!id)
    newSlots.forEach((s, i) => {
      const idx = remaining.findIndex((id) => game.players[id]?.role === s.role)
      if (idx >= 0) {
        lineup[i] = remaining[idx]
        remaining.splice(idx, 1)
      }
    })
    const used = new Set(lineup.filter((x): x is string => !!x))
    onChange({ ...tactics, formation, lineup, bench: pickBench(squad.filter(isAvailable), used) })
    setSelected(null)
  }

  const assign = (slotIndex: number, playerId: string) => {
    const lineup = tactics.lineup.slice()
    const existing = lineup.indexOf(playerId)
    if (existing >= 0) lineup[existing] = lineup[slotIndex]
    lineup[slotIndex] = playerId
    const used = new Set(lineup.filter((x): x is string => !!x))
    onChange({ ...tactics, lineup, bench: pickBench(squad.filter(isAvailable), used) })
    setSelected(null)
  }

  const clear = (slotIndex: number) => {
    const lineup = tactics.lineup.slice()
    lineup[slotIndex] = null
    const used = new Set(lineup.filter((x): x is string => !!x))
    onChange({ ...tactics, lineup, bench: pickBench(squad.filter(isAvailable), used) })
    setSelected(null)
  }

  const slot = selected !== null ? slots[selected] : null
  const candidates = slot
    ? squad
        .map((p) => ({ p, r: matchRating(p, slot.role, p.condition) }))
        .sort((a, b) => b.r - a.r)
    : []
  const unavailableInXI = tactics.lineup.filter((id) => id && !isAvailable(game.players[id])).length
  const missing = tactics.lineup.filter((id) => !id).length

  return (
    <div className="grid2">
      <div className="panel">
        <div className="panel-head">
          <h2>Formation &amp; lineup</h2>
          <button type="button" className="btn sm secondary" onClick={() => onChange(autoPickLineup(game, clubId, tactics))}>
            Auto pick
          </button>
        </div>
        <div className="row" style={{ marginBottom: 12 }}>
          <label className="field">
            Formation
            <select value={tactics.formation} onChange={(e) => setFormation(e.target.value as FormationKey)}>
              {FORMATION_KEYS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </label>
          {(unavailableInXI > 0 || missing > 0) && (
            <span className="chip red">
              {missing > 0 ? `${missing} empty slot${missing > 1 ? 's' : ''}` : ''}
              {missing > 0 && unavailableInXI > 0 ? ' · ' : ''}
              {unavailableInXI > 0 ? `${unavailableInXI} unavailable` : ''}
            </span>
          )}
        </div>
        <Pitch game={game} formation={tactics.formation} lineup={tactics.lineup} selected={selected} onSlot={(i) => setSelected(selected === i ? null : i)} club={club} />
        <p className="small muted" style={{ marginTop: 10 }}>
          Tap a position to choose who plays there. The number under each name is their expected match rating in that role at current fitness.
        </p>
      </div>

      <div className="stack">
        {slot ? (
          <div className="panel">
            <div className="panel-head">
              <h2>
                Pick {slot.label} <span className="muted small">({slot.role})</span>
              </h2>
              <div className="row">
                {tactics.lineup[selected as number] && (
                  <button type="button" className="btn sm secondary" onClick={() => clear(selected as number)}>
                    Clear
                  </button>
                )}
                <button type="button" className="btn sm secondary" onClick={() => setSelected(null)}>
                  Done
                </button>
              </div>
            </div>
            <div className="list picker">
              {candidates.map(({ p, r }) => {
                const inXI = tactics.lineup.indexOf(p.id)
                const avail = isAvailable(p)
                return (
                  <div key={p.id} className={`item ${avail ? 'clickable' : ''}`} onClick={() => avail && assign(selected as number, p.id)} style={{ opacity: avail ? 1 : 0.5 }}>
                    <RoleTag role={p.role} />
                    <span style={{ flex: 1 }}>
                      {p.name} <Status p={p} />
                      {inXI >= 0 && <span className="chip on">{slots[inXI].label}</span>}
                    </span>
                    <span className="small muted">{Math.round(p.condition)}%</span>
                    <Attr value={r} />
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="panel">
            <h2>Instructions</h2>
            <div className="stack">
              <label className="field">
                Mentality
                <Seg value={tactics.mentality} options={MENTALITIES} onChange={(mentality) => onChange({ ...tactics, mentality })} />
              </label>
              <label className="field">
                Width
                <Seg value={tactics.width} options={WIDTHS} onChange={(width) => onChange({ ...tactics, width })} />
              </label>
              <label className="field">
                Tempo
                <Seg value={tactics.tempo} options={TEMPOS} onChange={(tempo) => onChange({ ...tactics, tempo })} />
              </label>
              <label className="field">
                Pressing
                <Seg value={tactics.pressing} options={PRESSINGS} onChange={(pressing) => onChange({ ...tactics, pressing })} />
              </label>
            </div>
            <p className="small muted" style={{ marginTop: 12 }}>
              Attacking mentalities create more chances but leave you open. High pressing wins the midfield but tires players and concedes fouls. Fast tempo
              means more chances at both ends.
            </p>
          </div>
        )}

        <div className="panel">
          <h2>Bench</h2>
          <div className="list">
            {tactics.bench.map((id) => {
              const p = game.players[id]
              if (!p) return null
              return (
                <div key={id} className="item">
                  <RoleTag role={p.role} />
                  <span style={{ flex: 1 }}>{p.name}</span>
                  <span className="small muted">{Math.round(p.condition)}%</span>
                  <Attr value={matchRating(p, p.role, p.condition)} />
                </div>
              )
            })}
            {!tactics.bench.length && <div className="muted small">Bench is filled automatically from the players not in your XI.</div>}
          </div>
        </div>
      </div>
    </div>
  )
}
