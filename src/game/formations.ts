import type { FormationKey, Role } from './types'

export interface Slot {
  role: Role
  label: string
  /** 0 = left touchline, 100 = right touchline */
  x: number
  /** 0 = own goal line, 100 = opposition goal line */
  y: number
}

const s = (role: Role, label: string, x: number, y: number): Slot => ({ role, label, x, y })

export const FORMATIONS: Record<FormationKey, Slot[]> = {
  '4-4-2': [
    s('GK', 'GK', 50, 6),
    s('DF', 'LB', 14, 28),
    s('DF', 'CB', 38, 24),
    s('DF', 'CB', 62, 24),
    s('DF', 'RB', 86, 28),
    s('MF', 'LM', 14, 56),
    s('MF', 'CM', 38, 52),
    s('MF', 'CM', 62, 52),
    s('MF', 'RM', 86, 56),
    s('FW', 'ST', 38, 84),
    s('FW', 'ST', 62, 84),
  ],
  '4-3-3': [
    s('GK', 'GK', 50, 6),
    s('DF', 'LB', 14, 28),
    s('DF', 'CB', 38, 24),
    s('DF', 'CB', 62, 24),
    s('DF', 'RB', 86, 28),
    s('MF', 'CM', 28, 52),
    s('MF', 'DM', 50, 44),
    s('MF', 'CM', 72, 52),
    s('FW', 'LW', 16, 80),
    s('FW', 'ST', 50, 88),
    s('FW', 'RW', 84, 80),
  ],
  '4-2-3-1': [
    s('GK', 'GK', 50, 6),
    s('DF', 'LB', 14, 28),
    s('DF', 'CB', 38, 24),
    s('DF', 'CB', 62, 24),
    s('DF', 'RB', 86, 28),
    s('MF', 'DM', 38, 44),
    s('MF', 'DM', 62, 44),
    s('MF', 'LW', 16, 66),
    s('MF', 'AM', 50, 68),
    s('MF', 'RW', 84, 66),
    s('FW', 'ST', 50, 88),
  ],
  '3-5-2': [
    s('GK', 'GK', 50, 6),
    s('DF', 'CB', 26, 24),
    s('DF', 'CB', 50, 22),
    s('DF', 'CB', 74, 24),
    s('MF', 'LWB', 10, 50),
    s('MF', 'CM', 34, 52),
    s('MF', 'DM', 50, 42),
    s('MF', 'CM', 66, 52),
    s('MF', 'RWB', 90, 50),
    s('FW', 'ST', 38, 84),
    s('FW', 'ST', 62, 84),
  ],
  '5-3-2': [
    s('GK', 'GK', 50, 6),
    s('DF', 'LWB', 10, 34),
    s('DF', 'CB', 30, 24),
    s('DF', 'CB', 50, 22),
    s('DF', 'CB', 70, 24),
    s('DF', 'RWB', 90, 34),
    s('MF', 'CM', 30, 54),
    s('MF', 'CM', 50, 50),
    s('MF', 'CM', 70, 54),
    s('FW', 'ST', 38, 84),
    s('FW', 'ST', 62, 84),
  ],
  '4-1-4-1': [
    s('GK', 'GK', 50, 6),
    s('DF', 'LB', 14, 28),
    s('DF', 'CB', 38, 24),
    s('DF', 'CB', 62, 24),
    s('DF', 'RB', 86, 28),
    s('MF', 'DM', 50, 42),
    s('MF', 'LM', 14, 60),
    s('MF', 'CM', 38, 58),
    s('MF', 'CM', 62, 58),
    s('MF', 'RM', 86, 60),
    s('FW', 'ST', 50, 88),
  ],
}

export const FORMATION_KEYS = Object.keys(FORMATIONS) as FormationKey[]
