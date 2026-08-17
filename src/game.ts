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

export type Call = { limb: Limb; color: Color }

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

/** Draws a limb/colour pair, never repeating the previous call exactly. */
export function randomCall(previous?: Call | null): Call {
  for (;;) {
    const call = { limb: pick(LIMBS), color: pick(COLORS) }
    if (!previous || call.limb !== previous.limb || call.color !== previous.color) return call
  }
}

export function callText({ limb, color }: Call): string {
  return `${LIMB_LABEL[limb]} on ${COLOR_LABEL[color]}`
}
