import type { Role } from '../types'

export interface SavedTournament {
  id: string
  name: string
  role: Role
  lastVisited: number
}

const STORAGE_KEY = 'pb_tournaments'
const LAST_ID_KEY = 'pb_lastTournamentId'
const MAX_SAVED = 20

export function getSavedTournaments(): SavedTournament[] {
  let list: SavedTournament[] = []
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    if (Array.isArray(parsed)) {
      list = parsed
        .filter((t): t is Partial<SavedTournament> => !!t && typeof t === 'object' && typeof t.id === 'string')
        .map(t => ({
          id: t.id as string,
          name: typeof t.name === 'string' && t.name.trim() ? t.name : 'Untitled Tournament',
          role: t.role === 'viewer' ? 'viewer' : 'admin',
          lastVisited: typeof t.lastVisited === 'number' ? t.lastVisited : 0,
        }))
    }
  } catch {
    list = []
  }

  // Migrate the old single-value resume key into the visible list.
  const lastId = localStorage.getItem(LAST_ID_KEY)
  if (lastId && !list.some(t => t.id === lastId)) {
    list.push({ id: lastId, name: 'Previous Tournament', role: 'admin', lastVisited: 0 })
  }

  return list.sort((a, b) => b.lastVisited - a.lastVisited)
}

export function saveTournament(t: SavedTournament): void {
  if (!t.id || t.id.startsWith('local_')) return
  const name = t.name.trim() || 'Untitled Tournament'
  const list = getSavedTournaments().filter(x => x.id !== t.id)
  // Keep host access if this browser ever had it for the tournament.
  const role = getSavedTournament(t.id)?.role === 'admin' ? 'admin' : t.role
  list.unshift({ ...t, name, role })
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, MAX_SAVED)))
  localStorage.setItem(LAST_ID_KEY, t.id)
}

export function removeSavedTournament(id: string): void {
  const list = getSavedTournaments().filter(t => t.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  if (localStorage.getItem(LAST_ID_KEY) === id) {
    localStorage.removeItem(LAST_ID_KEY)
  }
}

export function getSavedTournament(id: string): SavedTournament | undefined {
  return getSavedTournaments().find(t => t.id === id)
}

export function getLastTournamentId(): string | null {
  return localStorage.getItem(LAST_ID_KEY)
}
