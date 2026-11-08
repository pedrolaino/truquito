/** Score of a real-life game kept by hand: "nosotros" and "ellos". */
export interface Tally {
  target: 15 | 30
  points: [number, number]
}

export const newTally = (target: 15 | 30): Tally => ({ target, points: [0, 0] })

export function addPoint(tally: Tally, team: 0 | 1, delta: 1 | -1): Tally {
  const points: [number, number] = [...tally.points]
  points[team] = Math.min(tally.target, Math.max(0, points[team] + delta))
  return { ...tally, points }
}

export function tallyWinner(tally: Tally): 0 | 1 | null {
  const team = tally.points.findIndex((p) => p >= tally.target)
  return team === -1 ? null : (team as 0 | 1)
}

/** Reads a saved tally back, rejecting anything that does not look like one. */
export function parseTally(raw: string | null): Tally | null {
  try {
    const data = JSON.parse(raw ?? '') as Tally
    const { target, points } = data
    if (target !== 15 && target !== 30) return null
    if (!Array.isArray(points) || points.length !== 2) return null
    if (!points.every((p) => Number.isInteger(p) && p >= 0 && p <= target)) return null
    return { target, points: [points[0], points[1]] }
  } catch {
    return null
  }
}
