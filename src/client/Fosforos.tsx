// Score drawn the way it is kept at an Argentine table: four matches make a
// square and the fifth crosses it. Each stick is [tail x, tail y, head x, head y].
// The sides go clockwise from the left one, head up, and meet at the corners
// with one head on each; the diagonal's head lands on the top right one.
export const STICKS = [
  [7, 40, 7, 7],
  [7, 7, 41, 7],
  [41, 7, 41, 40],
  [41, 40, 7, 40],
  [7, 40, 41, 7],
] as const

function Group({ count }: { count: number }) {
  const sticks = STICKS.slice(0, count)
  return (
    <svg className="fosforo-group" viewBox="0 0 48 46" aria-hidden="true">
      {sticks.map(([x1, y1, x2, y2], i) => (
        <line
          key={i}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke="var(--wood)"
          strokeWidth="4.5"
          strokeLinecap="round"
        />
      ))}
      {/* Heads go last so a stick never covers the head on its corner. */}
      {sticks.map(([, , x, y], i) => (
        <circle key={i} cx={x} cy={y} r="4" fill="var(--match-head)" />
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
