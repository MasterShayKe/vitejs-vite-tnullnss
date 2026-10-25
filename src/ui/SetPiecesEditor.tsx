import { autoSetPieces, clubPlayers } from '../game/ai'
import { isAvailable, penaltyScore, setPieceTakerScore } from '../game/rating'
import type { CornerRoutine, FreeKickRoutine, GameState, Marking, Player, SetPieces } from '../game/types'
import { Attr, RoleTag, Seg } from './common'

const CORNER: CornerRoutine[] = ['near', 'far', 'short', 'edge']
const CORNER_LABEL: Record<CornerRoutine, string> = { near: 'Near post', far: 'Far post', short: 'Short', edge: 'Edge of box' }
const CORNER_BLURB: Record<CornerRoutine, string> = {
  near: 'Whipped delivery for your target man to attack. Best with a strong header and an accurate taker. Weaker against man marking.',
  far: 'Deep delivery to the back post. Same strengths as near post but harder for the keeper to claim.',
  short: 'Keep possession and work a shooting chance. Reliable, fewer headers; zonal defences squeeze it out.',
  edge: 'Pull it back for your best shooter to strike from distance. Needs a quality taker and finisher.',
}
const FK: FreeKickRoutine[] = ['direct', 'cross', 'short']
const FK_LABEL: Record<FreeKickRoutine, string> = { direct: 'Shoot', cross: 'Cross', short: 'Short' }
const FK_BLURB: Record<FreeKickRoutine, string> = {
  direct: 'Taker goes for goal. Pays off with an elite set-piece specialist.',
  cross: 'Delivery into the box for the target man. Good when your header beats theirs.',
  short: 'Work the ball for an open-play chance.',
}
const MARK: Marking[] = ['zonal', 'man']
const MARK_LABEL: Record<Marking, string> = { zonal: 'Zonal', man: 'Man to man' }

export function SetPiecesEditor({ game, clubId, onChange }: { game: GameState; clubId: string; onChange: (sp: SetPieces) => void }) {
  const sp = game.setPieces[clubId]
  const squad = clubPlayers(game, clubId).filter((p) => p.role !== 'GK')
  const byTaker = [...squad].sort((a, b) => setPieceTakerScore(b) - setPieceTakerScore(a))
  const byPen = [...squad].sort((a, b) => penaltyScore(b) - penaltyScore(a))
  const byHead = [...squad].sort((a, b) => b.attrs.heading - a.attrs.heading)
  const spGoals = clubPlayers(game, clubId).reduce((s, p) => s + p.stats.setPieceGoals, 0)

  const PlayerSelect = ({ value, onPick, list, score }: { value: string | null; onPick: (id: string | null) => void; list: Player[]; score: (p: Player) => number }) => (
    <select value={value ?? ''} onChange={(e) => onPick(e.target.value || null)}>
      <option value="">Assistant decides</option>
      {list.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name} ({p.role}) · {score(p).toFixed(1)}
          {!isAvailable(p) ? ' · unavailable' : ''}
        </option>
      ))}
    </select>
  )

  return (
    <div className="grid2">
      <div className="stack">
        <div className="panel">
          <div className="panel-head">
            <h2>Takers</h2>
            <button type="button" className="btn sm secondary" onClick={() => onChange({ ...autoSetPieces(game, clubId), cornerRoutine: sp.cornerRoutine, freeKickRoutine: sp.freeKickRoutine, marking: sp.marking })}>
              Auto assign
            </button>
          </div>
          <div className="stack">
            <label className="field">
              Corner taker
              <PlayerSelect value={sp.cornerTaker} onPick={(cornerTaker) => onChange({ ...sp, cornerTaker })} list={byTaker} score={setPieceTakerScore} />
            </label>
            <label className="field">
              Free-kick taker
              <PlayerSelect value={sp.freeKickTaker} onPick={(freeKickTaker) => onChange({ ...sp, freeKickTaker })} list={byTaker} score={setPieceTakerScore} />
            </label>
            <label className="field">
              Penalty taker
              <PlayerSelect value={sp.penaltyTaker} onPick={(penaltyTaker) => onChange({ ...sp, penaltyTaker })} list={byPen} score={penaltyScore} />
            </label>
            <label className="field">
              Target man (aerial threat)
              <PlayerSelect value={sp.targetMan} onPick={(targetMan) => onChange({ ...sp, targetMan })} list={byHead} score={(p) => p.attrs.heading} />
            </label>
          </div>
          <p className="small muted" style={{ marginTop: 10 }}>
            If a chosen taker is not on the pitch, the best available set-piece taker steps up.
          </p>
        </div>

        <div className="panel">
          <h2>Routines</h2>
          <div className="stack">
            <label className="field">
              Corners
              <Seg value={sp.cornerRoutine} options={CORNER} labels={CORNER_LABEL} onChange={(cornerRoutine) => onChange({ ...sp, cornerRoutine })} />
              <span className="small">{CORNER_BLURB[sp.cornerRoutine]}</span>
            </label>
            <label className="field">
              Attacking free kicks
              <Seg value={sp.freeKickRoutine} options={FK} labels={FK_LABEL} onChange={(freeKickRoutine) => onChange({ ...sp, freeKickRoutine })} />
              <span className="small">{FK_BLURB[sp.freeKickRoutine]}</span>
            </label>
            <label className="field">
              Defending set pieces
              <Seg value={sp.marking} options={MARK} labels={MARK_LABEL} onChange={(marking) => onChange({ ...sp, marking })} />
              <span className="small">
                {sp.marking === 'man' ? 'Tracks the opposition target man; better against deliveries into the box.' : 'Protects space; better against short routines and shots from the edge.'}
              </span>
            </label>
          </div>
        </div>
      </div>

      <div className="stack">
        <div className="panel">
          <h2>Specialists</h2>
          <h3>Dead-ball delivery</h3>
          <div className="list">
            {byTaker.slice(0, 5).map((p) => (
              <div key={p.id} className="item">
                <RoleTag role={p.role} />
                <span style={{ flex: 1 }}>{p.name}</span>
                <span className="small muted">SPC</span>
                <Attr value={p.attrs.setPieces} />
                <span className="small muted">PAS</span>
                <Attr value={p.attrs.passing} />
              </div>
            ))}
          </div>
          <h3 style={{ marginTop: 14 }}>Penalties</h3>
          <div className="list">
            {byPen.slice(0, 3).map((p) => (
              <div key={p.id} className="item">
                <RoleTag role={p.role} />
                <span style={{ flex: 1 }}>{p.name}</span>
                <span className="small muted">SPC</span>
                <Attr value={p.attrs.setPieces} />
                <span className="small muted">SHO</span>
                <Attr value={p.attrs.shooting} />
              </div>
            ))}
          </div>
          <h3 style={{ marginTop: 14 }}>Aerial threats</h3>
          <div className="list">
            {byHead.slice(0, 5).map((p) => (
              <div key={p.id} className="item">
                <RoleTag role={p.role} />
                <span style={{ flex: 1 }}>{p.name}</span>
                <span className="small muted">HEA</span>
                <Attr value={p.attrs.heading} />
                <span className="small muted">PHY</span>
                <Attr value={p.attrs.physical} />
              </div>
            ))}
          </div>
        </div>
        <div className="panel">
          <div className="small muted">Set-piece goals this season</div>
          <div className="big-stat">{spGoals}</div>
        </div>
      </div>
    </div>
  )
}
