/** Score of a real-life game kept by hand: "nosotros" and "ellos". */
export interface Tally {
  target: 15 | 30
  points: [number, number]
  /**
   * Points each side made during puntas (each player against the one across),
   * kept apart until the puntas end. Null when not playing puntas.
   */
  puntas: [number, number] | null
}

type Team = 0 | 1

// Puntas can run long; the cap only keeps a stuck finger from growing it forever.
const MAX_PUNTAS = 999

export const newTally = (target: 15 | 30): Tally => ({ target, points: [0, 0], puntas: null })

export function addPoint(tally: Tally, team: Team, delta: 1 | -1): Tally {
  const points: [number, number] = [...tally.points]
  points[team] = Math.min(tally.target, Math.max(0, points[team] + delta))
  return { ...tally, points }
}

export function tallyWinner(tally: Tally): Team | null {
  const team = tally.points.findIndex((p) => p >= tally.target)
  return team === -1 ? null : (team as Team)
}

export const startPuntas = (tally: Tally): Tally => ({ ...tally, puntas: [0, 0] })

export function addPunta(tally: Tally, team: Team, delta: 1 | -1): Tally {
  if (!tally.puntas) return tally
  const puntas: [number, number] = [...tally.puntas]
  puntas[team] = Math.min(MAX_PUNTAS, Math.max(0, puntas[team] + delta))
  return { ...tally, puntas }
}

/** Who comes out ahead of the puntas and by how much; null on a tie. */
export function puntasResult(tally: Tally): { team: Team; points: number } | null {
  if (!tally.puntas) return null
  const [ours, theirs] = tally.puntas
  if (ours === theirs) return null
  return ours > theirs ? { team: 0, points: ours - theirs } : { team: 1, points: theirs - ours }
}

/** Ends the puntas: only the difference goes to the side that made more. */
export function finishPuntas(tally: Tally): Tally {
  const result = puntasResult(tally)
  const points: [number, number] = [...tally.points]
  if (result) points[result.team] = Math.min(tally.target, points[result.team] + result.points)
  return { ...tally, points, puntas: null }
}

const validCount = (p: unknown, max: number) =>
  Number.isInteger(p) && (p as number) >= 0 && (p as number) <= max

/** Reads a saved tally back, rejecting anything that does not look like one. */
export function parseTally(raw: string | null): Tally | null {
  try {
    const data = JSON.parse(raw ?? '') as Partial<Tally>
    const { target, points, puntas } = data
    if (target !== 15 && target !== 30) return null
    if (!Array.isArray(points) || points.length !== 2) return null
    if (!points.every((p) => validCount(p, target))) return null
    if (puntas !== undefined && puntas !== null) {
      if (!Array.isArray(puntas) || puntas.length !== 2) return null
      if (!puntas.every((p) => validCount(p, MAX_PUNTAS))) return null
    }
    return {
      target,
      points: [points[0], points[1]],
      puntas: puntas ? [puntas[0], puntas[1]] : null,
    }
  } catch {
    return null
  }
}
