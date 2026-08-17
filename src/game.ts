export const COLORS = ['red', 'yellow', 'blue', 'green'] as const
export type Color = (typeof COLORS)[number]

export const LIMBS = ['right-hand', 'left-hand', 'right-foot', 'left-foot'] as const
export type Limb = (typeof LIMBS)[number]

export const COLOR_HEX: Record<Color, string> = {
  red: '#e5352b',
  yellow: '#f5c518',
  blue: '#1a6fe0',
  green: '#22a95a',
}

export const COLOR_LABEL: Record<Color, string> = {
  red: 'Red',
  yellow: 'Yellow',
  blue: 'Blue',
  green: 'Green',
}

export const LIMB_LABEL: Record<Limb, string> = {
  'right-hand': 'Right Hand',
  'left-hand': 'Left Hand',
  'right-foot': 'Right Foot',
  'left-foot': 'Left Foot',
}

export const LIMB_ICON: Record<Limb, string> = {
  'right-hand': '✋',
  'left-hand': '✋',
  'right-foot': '🦶',
  'left-foot': '🦶',
}

/** The emoji are drawn as a right limb; mirror them for the left ones. */
export function isLeft(limb: Limb): boolean {
  return limb.startsWith('left-')
}

/** The wheel has 16 wedges: one per limb/color pair, grouped into four quadrants. */
export const WEDGE_COUNT = LIMBS.length * COLORS.length
export const WEDGE_ANGLE = 360 / WEDGE_COUNT

export type Call = { limb: Limb; color: Color }

export function wedgeAt(index: number): Call {
  return {
    limb: LIMBS[Math.floor(index / COLORS.length)],
    color: COLORS[index % COLORS.length],
  }
}

export function randomWedge(exclude?: number): number {
  const next = Math.floor(Math.random() * WEDGE_COUNT)
  // Avoid repeating the exact same call twice in a row — it makes the game dull.
  if (next === exclude) return (next + 1 + Math.floor(Math.random() * (WEDGE_COUNT - 1))) % WEDGE_COUNT
  return next
}

/** Angle (degrees, clockwise from 12 o'clock) the needle must point at to land on a wedge. */
export function wedgeCenterAngle(index: number): number {
  return index * WEDGE_ANGLE + WEDGE_ANGLE / 2
}

export function callText({ limb, color }: Call): string {
  return `${LIMB_LABEL[limb]} on ${COLOR_LABEL[color]}`
}
