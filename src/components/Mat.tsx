import { COLORS, COLOR_HEX, COLOR_LABEL, type Color } from '../game'

const CIRCLES_PER_ROW = 6

type Props = { activeColor: Color | null }

export default function Mat({ activeColor }: Props) {
  return (
    <div className="mat" aria-label="Twister mat">
      {COLORS.map((color) => (
        <div
          key={color}
          className={`mat-row${activeColor === color ? ' is-active' : ''}`}
          aria-label={`${COLOR_LABEL[color]} row`}
        >
          {Array.from({ length: CIRCLES_PER_ROW }, (_, i) => (
            <span key={i} className="mat-dot" style={{ background: COLOR_HEX[color] }} />
          ))}
        </div>
      ))}
    </div>
  )
}
