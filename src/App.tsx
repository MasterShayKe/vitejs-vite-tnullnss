import { useCallback, useRef, useState } from 'react'
import { newGame, type NewGameOptions } from './game/generate'
import { clearSave, loadGame, saveGame } from './game/storage'
import type { GameState } from './game/types'
import { Setup } from './ui/Setup'
import { Shell } from './ui/Shell'

export default function App() {
  const [game, setGame] = useState<GameState | null>(() => loadGame())
  const gameRef = useRef(game)

  // Mutate the live state object once, outside React's updater, then publish a new reference.
  const update = useCallback((fn: (g: GameState) => void) => {
    const current = gameRef.current
    if (!current) return
    fn(current)
    const next = { ...current }
    gameRef.current = next
    saveGame(next)
    setGame(next)
  }, [])

  const start = (opts: NewGameOptions) => {
    const g = newGame(opts)
    gameRef.current = g
    saveGame(g)
    setGame(g)
  }

  const reset = () => {
    clearSave()
    gameRef.current = null
    setGame(null)
  }

  if (!game) return <Setup onStart={start} />
  return <Shell game={game} update={update} onReset={reset} />
}
