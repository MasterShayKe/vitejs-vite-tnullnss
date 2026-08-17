import { COLOR_HEX, LIMBS, LIMB_LABEL, WEDGE_ANGLE, WEDGE_COUNT, wedgeAt } from '../game'

const RING_OUTER = 100
const RING_INNER = 78
const WEDGE_OUTER = 76
const WEDGE_INNER = 26
const HUB = 24

/** Point on a circle, angle in degrees measured clockwise from 12 o'clock. */
function point(radius: number, angle: number) {
  const rad = ((angle - 90) * Math.PI) / 180
  return [radius * Math.cos(rad), radius * Math.sin(rad)] as const
}

function wedgePath(index: number, inner: number, outer: number) {
  const a0 = index * WEDGE_ANGLE
  const a1 = a0 + WEDGE_ANGLE
  const [x0, y0] = point(outer, a0)
  const [x1, y1] = point(outer, a1)
  const [x2, y2] = point(inner, a1)
  const [x3, y3] = point(inner, a0)
  return [
    `M ${x0} ${y0}`,
    `A ${outer} ${outer} 0 0 1 ${x1} ${y1}`,
    `L ${x2} ${y2}`,
    `A ${inner} ${inner} 0 0 0 ${x3} ${y3}`,
    'Z',
  ].join(' ')
}

function arcPath(radius: number, from: number, to: number, clockwise: boolean) {
  const [x0, y0] = point(radius, from)
  const [x1, y1] = point(radius, to)
  return `M ${x0} ${y0} A ${radius} ${radius} 0 0 ${clockwise ? 1 : 0} ${x1} ${y1}`
}

// Labels on the lower half are drawn counter-clockwise so the glyphs stay upright.
const LABEL_ARCS = LIMBS.map((limb, i) => {
  const start = i * 90
  const end = start + 90
  const upright = start < 90 || start >= 270
  return {
    limb,
    id: `label-${limb}`,
    d: upright ? arcPath(84, start, end, true) : arcPath(94, end, start, false),
  }
})

type Props = {
  rotation: number
  spinning: boolean
  durationMs: number
  resultIndex: number | null
  onSpin: () => void
}

export default function Spinner({ rotation, spinning, durationMs, resultIndex, onSpin }: Props) {
  return (
    <svg className="spinner" viewBox="-110 -110 220 220" role="img" aria-label="Twister spinner">
      <defs>
        {LABEL_ARCS.map((arc) => (
          <path key={arc.id} id={arc.id} d={arc.d} />
        ))}
        <filter id="needle-shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.45" />
        </filter>
      </defs>

      <circle r={RING_OUTER + 6} fill="#0b0e1c" />
      <circle r={RING_OUTER} fill="#1b2140" />

      {/* Quadrant bands behind the limb names */}
      {LIMBS.map((limb, i) => {
        const a0 = i * 90
        const [x0, y0] = point(RING_OUTER, a0)
        const [x1, y1] = point(RING_OUTER, a0 + 90)
        const [x2, y2] = point(RING_INNER, a0 + 90)
        const [x3, y3] = point(RING_INNER, a0)
        return (
          <path
            key={limb}
            d={`M ${x0} ${y0} A ${RING_OUTER} ${RING_OUTER} 0 0 1 ${x1} ${y1} L ${x2} ${y2} A ${RING_INNER} ${RING_INNER} 0 0 0 ${x3} ${y3} Z`}
            fill={i % 2 === 0 ? '#232b52' : '#1b2140'}
            stroke="#0b0e1c"
            strokeWidth={1.5}
          />
        )
      })}

      {LABEL_ARCS.map((arc) => (
        <text key={arc.id} className="limb-label">
          <textPath href={`#${arc.id}`} startOffset="50%" textAnchor="middle">
            {LIMB_LABEL[arc.limb].toUpperCase()}
          </textPath>
        </text>
      ))}

      {Array.from({ length: WEDGE_COUNT }, (_, i) => {
        const { color } = wedgeAt(i)
        const isResult = resultIndex === i && !spinning
        return (
          <path
            key={i}
            d={wedgePath(i, WEDGE_INNER, WEDGE_OUTER)}
            fill={COLOR_HEX[color]}
            stroke="#0b0e1c"
            strokeWidth={1.5}
            opacity={resultIndex === null || spinning || isResult ? 1 : 0.55}
          />
        )
      })}

      {resultIndex !== null && !spinning && (
        <path
          d={wedgePath(resultIndex, WEDGE_INNER, WEDGE_OUTER)}
          fill="none"
          stroke="#f7f7fb"
          strokeWidth={3}
        />
      )}

      <g
        className="needle"
        style={{
          transform: `rotate(${rotation}deg)`,
          transitionDuration: `${durationMs}ms`,
        }}
        filter="url(#needle-shadow)"
      >
        <path d={`M 0 ${-WEDGE_OUTER + 4} L 9 -8 L 0 14 L -9 -8 Z`} fill="#f7f7fb" stroke="#0b0e1c" strokeWidth={2} />
      </g>

      <circle r={HUB} fill="#0b0e1c" stroke="#3a4374" strokeWidth={2} />
      <g className="hub-button" onClick={spinning ? undefined : onSpin} aria-hidden="true">
        <circle r={HUB - 4} fill="#161b36" />
        <text className="hub-label" y={4}>
          {spinning ? '…' : 'SPIN'}
        </text>
      </g>
    </svg>
  )
}
