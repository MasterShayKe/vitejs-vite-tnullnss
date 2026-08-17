import { useCallback, useEffect, useRef, useState } from 'react'
import Spinner from './components/Spinner'
import Mat from './components/Mat'
import {
  COLOR_HEX,
  COLOR_LABEL,
  LIMB_ICON,
  LIMB_LABEL,
  callText,
  isLeft,
  randomWedge,
  wedgeAt,
  wedgeCenterAngle,
  type Call,
} from './game'

const SPIN_MS = 3600
const MAX_PLAYERS = 8
const HISTORY_LENGTH = 8

type HistoryEntry = Call & { player: string; id: number }

export default function App() {
  const [players, setPlayers] = useState<string[]>(['Player 1', 'Player 2'])
  const [turn, setTurn] = useState(0)
  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [resultIndex, setResultIndex] = useState<number | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [announce, setAnnounce] = useState(true)
  const timeoutRef = useRef<number | undefined>(undefined)
  const spinningRef = useRef(false)
  const announceRef = useRef(announce)

  announceRef.current = announce

  useEffect(() => () => window.clearTimeout(timeoutRef.current), [])

  const spin = useCallback(() => {
    if (spinningRef.current) return
    spinningRef.current = true

    const index = randomWedge(resultIndex ?? undefined)
    const turns = 4 + Math.floor(Math.random() * 3)
    setSpinning(true)
    setResultIndex(null)
    setRotation((current) => current - (current % 360) + turns * 360 + wedgeCenterAngle(index))

    timeoutRef.current = window.setTimeout(() => {
      const call = wedgeAt(index)
      spinningRef.current = false
      setResultIndex(index)
      setSpinning(false)
      setHistory((entries) =>
        [{ ...call, player: players[turn] ?? 'Player', id: Date.now() }, ...entries].slice(0, HISTORY_LENGTH),
      )
      setTurn((current) => (players.length ? (current + 1) % players.length : 0))

      if (announceRef.current && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(callText(call)))
      }
    }, SPIN_MS)
  }, [players, resultIndex, turn])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'BUTTON')) return
      if (event.code === 'Space' || event.code === 'Enter') {
        event.preventDefault()
        spin()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [spin])

  const result = resultIndex !== null && !spinning ? wedgeAt(resultIndex) : null
  const currentPlayer = players[turn] ?? 'Player'

  const addPlayer = () =>
    setPlayers((current) => (current.length >= MAX_PLAYERS ? current : [...current, `Player ${current.length + 1}`]))

  const removePlayer = () =>
    setPlayers((current) => {
      if (current.length <= 1) return current
      const next = current.slice(0, -1)
      setTurn((t) => t % next.length)
      return next
    })

  const renamePlayer = (index: number, name: string) =>
    setPlayers((current) => current.map((player, i) => (i === index ? name : player)))

  const reset = () => {
    window.clearTimeout(timeoutRef.current)
    spinningRef.current = false
    setSpinning(false)
    setResultIndex(null)
    setHistory([])
    setTurn(0)
  }

  return (
    <div className="app">
      <header className="header">
        <h1>
          Twister <span>Spinner</span>
        </h1>
        <p>Spin the wheel, put a hand or foot on the colour it lands on — and don't fall over.</p>
      </header>

      <main className="board">
        <section className="stage">
          <Spinner
            rotation={rotation}
            spinning={spinning}
            durationMs={SPIN_MS}
            resultIndex={resultIndex}
            onSpin={spin}
          />

          <div className={`call${result ? ' is-live' : ''}`} aria-live="polite">
            {spinning ? (
              <span className="call-waiting">Spinning…</span>
            ) : result ? (
              <>
                <span className="call-icon" style={isLeft(result.limb) ? { transform: 'scaleX(-1)' } : undefined}>
                  {LIMB_ICON[result.limb]}
                </span>
                <span className="call-text">
                  {LIMB_LABEL[result.limb]}
                  <strong style={{ color: COLOR_HEX[result.color] }}>{COLOR_LABEL[result.color]}</strong>
                </span>
              </>
            ) : (
              <span className="call-waiting">Ready when you are</span>
            )}
          </div>

          <button className="spin-button" onClick={spin} disabled={spinning}>
            {spinning ? 'Spinning…' : `Spin for ${currentPlayer}`}
          </button>
        </section>

        <aside className="panel">
          <div className="card">
            <h2>Players</h2>
            <ul className="players">
              {players.map((player, index) => (
                <li key={index} className={index === turn ? 'is-turn' : undefined}>
                  <input
                    value={player}
                    onChange={(event) => renamePlayer(index, event.target.value)}
                    aria-label={`Player ${index + 1} name`}
                    maxLength={16}
                  />
                  {index === turn && <span className="badge">up next</span>}
                </li>
              ))}
            </ul>
            <div className="row">
              <button onClick={removePlayer} disabled={players.length <= 1}>
                – Player
              </button>
              <button onClick={addPlayer} disabled={players.length >= MAX_PLAYERS}>
                + Player
              </button>
            </div>
          </div>

          <div className="card">
            <h2>Mat</h2>
            <Mat activeColor={result?.color ?? null} />
          </div>

          <div className="card">
            <h2>Last calls</h2>
            {history.length === 0 ? (
              <p className="empty">No spins yet.</p>
            ) : (
              <ol className="history">
                {history.map((entry) => (
                  <li key={entry.id}>
                    <span className="dot" style={{ background: COLOR_HEX[entry.color] }} />
                    <span className="who">{entry.player}</span>
                    <span className="what">{callText(entry)}</span>
                  </li>
                ))}
              </ol>
            )}
            <div className="row">
              <label className="toggle">
                <input type="checkbox" checked={announce} onChange={(event) => setAnnounce(event.target.checked)} />
                Say the call out loud
              </label>
              <button onClick={reset}>Reset</button>
            </div>
          </div>
        </aside>
      </main>

      <footer className="footer">Press space to spin.</footer>
    </div>
  )
}
