import { cleanName, isId } from '../shared/protocol.ts'
import { type Tally, parseTally } from './tally.ts'

// Everything read back from localStorage is validated: it can be edited by hand.
function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    // Private mode or full storage: the app still works, it just forgets.
  }
}

export const savedName = () => cleanName(read('truquito:name')) ?? ''
export const saveName = (name: string) => write('truquito:name', name)

export function savedToken(roomId: string): string | null {
  const token = read(`truquito:room:${roomId}`)
  return isId(token) ? token : null
}

export const saveToken = (roomId: string, token: string | null) =>
  write(`truquito:room:${roomId}`, token)

export const savedTally = () => parseTally(read('truquito:tally'))
export const saveTally = (tally: Tally | null) =>
  write('truquito:tally', tally && JSON.stringify(tally))

export const savedMuted = () => read('truquito:muted') === '1'
export const saveMuted = (muted: boolean) => write('truquito:muted', muted ? '1' : null)

/** Ids of finished lessons. Unknown ids are dropped by the caller. */
export function savedLessons(): string[] {
  try {
    const data: unknown = JSON.parse(read('truquito:lessons') ?? '[]')
    return Array.isArray(data) ? data.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

export const saveLessons = (ids: string[]) => write('truquito:lessons', JSON.stringify(ids))
