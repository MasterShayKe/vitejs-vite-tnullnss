import type { GameState } from './types'

const KEY = 'touchline-manager-save-v1'

export function saveGame(game: GameState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(game))
  } catch {
    // Storage may be unavailable (private mode, quota). The game keeps running in memory.
  }
}

export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as GameState
    if (parsed.version !== 1 || !parsed.players || !parsed.fixtures) return null
    if (parsed.phase === 'match') parsed.phase = 'match'
    return parsed
  } catch {
    return null
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}
