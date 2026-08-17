import { useCallback, useEffect, useState } from 'react'
import {
  COLOR_HEX,
  COLOR_LABEL,
  LIMB_ICON,
  LIMB_LABEL,
  isLeft,
  randomCall,
  type Call,
} from './game'

export default function App() {
  const [call, setCall] = useState<Call | null>(null)
  const [round, setRound] = useState(0)

  const draw = useCallback(() => {
    setCall((previous) => randomCall(previous))
    setRound((current) => current + 1)
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code === 'Space' || event.code === 'Enter') {
        event.preventDefault()
        draw()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [draw])

  return (
    <div className="app">
      <button
        type="button"
        className="card"
        key={round}
        onClick={draw}
        style={
          call
            ? // Yellow is too light for white text.
              { background: COLOR_HEX[call.color], color: call.color === 'yellow' ? '#101323' : '#fff' }
            : undefined
        }
        aria-live="polite"
      >
        {call ? (
          <>
            <span className="icon" style={isLeft(call.limb) ? { transform: 'scaleX(-1)' } : undefined}>
              {LIMB_ICON[call.limb]}
            </span>
            <span className="limb">{LIMB_LABEL[call.limb]}</span>
            <span className="color">{COLOR_LABEL[call.color]}</span>
          </>
        ) : (
          <span className="start">Tap to start</span>
        )}
      </button>

      <p className="hint">Tap the card or press space for the next move.</p>
    </div>
  )
}
