import { useMemo, useState } from 'react'
import { clubPlayers } from '../game/ai'
import { overall } from '../game/rating'
import { playerAvgRating } from '../game/season'
import { ATTR_KEYS, ATTR_LABEL, ATTR_SHORT, type AttrKey, type GameState, type Player } from '../game/types'
import { Attr, Bar, RoleTag, Status } from './common'

type SortKey = 'name' | 'role' | 'age' | 'overall' | 'condition' | 'morale' | 'apps' | 'goals' | 'assists' | 'rating' | AttrKey

const ROLE_ORDER = { GK: 0, DF: 1, MF: 2, FW: 3 }

function sortValue(p: Player, key: SortKey): number | string {
  switch (key) {
    case 'name':
      return p.name
    case 'role':
      return ROLE_ORDER[p.role]
    case 'age':
      return p.age
    case 'overall':
      return overall(p)
    case 'condition':
      return p.condition
    case 'morale':
      return p.morale
    case 'apps':
      return p.stats.apps
    case 'goals':
      return p.stats.goals
    case 'assists':
      return p.stats.assists
    case 'rating':
      return playerAvgRating(p)
    default:
      return p.attrs[key]
  }
}

export function Squad({ game, clubId }: { game: GameState; clubId: string }) {
  const [sort, setSort] = useState<SortKey>('role')
  const [asc, setAsc] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)

  const players = useMemo(() => {
    const list = clubPlayers(game, clubId)
    list.sort((a, b) => {
      const va = sortValue(a, sort)
      const vb = sortValue(b, sort)
      let c = typeof va === 'string' && typeof vb === 'string' ? va.localeCompare(vb) : (va as number) - (vb as number)
      if (c === 0) c = overall(b) - overall(a)
      return asc ? c : -c
    })
    return list
  }, [game, clubId, sort, asc])

  const setSortKey = (k: SortKey) => {
    if (k === sort) setAsc(!asc)
    else {
      setSort(k)
      setAsc(k === 'name' || k === 'role')
    }
  }

  const Th = ({ k, label, num }: { k: SortKey; label: string; num?: boolean }) => (
    <th className={`sortable ${num ? 'num' : ''}`} onClick={() => setSortKey(k)} title={label}>
      {label}
      {sort === k ? (asc ? ' ▲' : ' ▼') : ''}
    </th>
  )

  const sel = selected ? game.players[selected] : null

  return (
    <div className="grid2" style={{ gridTemplateColumns: sel ? '2fr 1fr' : '1fr' }}>
      <div className="panel">
        <div className="panel-head">
          <h2>Squad</h2>
          <span className="muted small">{players.length} players · click a name for details</span>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <Th k="role" label="Pos" />
                <Th k="name" label="Name" />
                <Th k="age" label="Age" num />
                <Th k="overall" label="Ovr" num />
                {ATTR_KEYS.map((k) => (
                  <Th key={k} k={k} label={ATTR_SHORT[k]} num />
                ))}
                <Th k="condition" label="Cond" />
                <Th k="morale" label="Mor" />
                <Th k="apps" label="Apps" num />
                <Th k="goals" label="Gls" num />
                <Th k="assists" label="Ast" num />
                <Th k="rating" label="Avg" num />
              </tr>
            </thead>
            <tbody>
              {players.map((p) => (
                <tr key={p.id} className={`clickable ${selected === p.id ? 'mine' : ''}`} onClick={() => setSelected(selected === p.id ? null : p.id)}>
                  <td>
                    <RoleTag role={p.role} />
                  </td>
                  <td>
                    {p.name} <Status p={p} />
                  </td>
                  <td className="num">{p.age}</td>
                  <td className="num">
                    <Attr value={overall(p)} />
                  </td>
                  {ATTR_KEYS.map((k) => (
                    <td key={k} className="num">
                      <Attr value={p.attrs[k]} />
                    </td>
                  ))}
                  <td>
                    <Bar value={p.condition} />
                  </td>
                  <td>
                    <Bar value={p.morale} />
                  </td>
                  <td className="num">{p.stats.apps}</td>
                  <td className="num">{p.stats.goals}</td>
                  <td className="num">{p.stats.assists}</td>
                  <td className="num">{p.stats.apps ? playerAvgRating(p).toFixed(2) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {sel && <PlayerDetail p={sel} onClose={() => setSelected(null)} />}
    </div>
  )
}

export function PlayerDetail({ p, onClose }: { p: Player; onClose?: () => void }) {
  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <h2>{p.name}</h2>
          <div className="row small muted">
            <RoleTag role={p.role} />
            <span>{p.age} years</span>
            <span>Potential {p.potential}</span>
            <Status p={p} />
          </div>
        </div>
        {onClose && (
          <button type="button" className="btn sm secondary" onClick={onClose}>
            Close
          </button>
        )}
      </div>
      <div className="stack">
        {ATTR_KEYS.map((k) => (
          <div key={k} className="row" style={{ justifyContent: 'space-between' }}>
            <span className="muted">{ATTR_LABEL[k]}</span>
            <span className="row">
              <Bar value={p.attrs[k]} max={20} />
              <Attr value={p.attrs[k]} />
            </span>
          </div>
        ))}
      </div>
      <div className="grid3" style={{ marginTop: 16 }}>
        <div>
          <div className="small muted">Apps</div>
          <div className="big-stat">{p.stats.apps}</div>
        </div>
        <div>
          <div className="small muted">Goals</div>
          <div className="big-stat">{p.stats.goals}</div>
        </div>
        <div>
          <div className="small muted">Assists</div>
          <div className="big-stat">{p.stats.assists}</div>
        </div>
        <div>
          <div className="small muted">Avg rating</div>
          <div className="big-stat">{p.stats.apps ? playerAvgRating(p).toFixed(2) : '-'}</div>
        </div>
        <div>
          <div className="small muted">Set-piece goals</div>
          <div className="big-stat">{p.stats.setPieceGoals}</div>
        </div>
        <div>
          <div className="small muted">Player of match</div>
          <div className="big-stat">{p.stats.motm}</div>
        </div>
      </div>
    </div>
  )
}
