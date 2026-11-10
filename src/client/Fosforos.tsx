// Score drawn the way it is kept at an Argentine table: four matches make a
// square and the fifth crosses it. Each stick is [tail x, tail y, head x, head y];
// the sides go clockwise from the left one, head up, so every corner gets one head.
export const STICKS = [
  [7, 40, 7, 8],
  [11, 6, 40, 6],
  [42, 10, 42, 39],
  [38, 41, 9, 41],
  [12, 35, 33, 14],
] as const

function Group({ count }: { count: number }) {
  return (
    <svg className="fosforo-group" viewBox="0 0 48 46" aria-hidden="true">
      {STICKS.slice(0, count).map(([x1, y1, x2, y2], i) => (
        <g key={i}>
          <line
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="var(--wood)"
            strokeWidth="4.5"
            strokeLinecap="round"
          />
          <circle cx={x2} cy={y2} r="4" fill="var(--match-head)" />
        </g>
      ))}
    </svg>
  )
}

function Row({ points }: { points: number }) {
  const groups = Array.from({ length: Math.ceil(points / 5) }, (_, g) =>
    Math.min(5, points - g * 5),
  )
  return (
    <span className="fosforos-row">
      {groups.map((count, g) => (
        <Group key={g} count={count} />
      ))}
    </span>
  )
}

/** Points as matchsticks; at 30 the malas and buenas go on separate rows. */
export function Fosforos({
  points,
  target,
  big,
}: {
  points: number
  target: number
  big?: boolean
}) {
  return (
    <span className={big ? 'fosforos fosforos-big' : 'fosforos'} aria-hidden="true">
      <Row points={Math.min(points, 15)} />
      {target === 30 && points > 15 && <Row points={points - 15} />}
    </span>
  )
}
