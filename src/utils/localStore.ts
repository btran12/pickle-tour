import type { TournamentState, WireState } from '../types'
import { getSerializableState, hydrateState } from './serialization'

/**
 * Offline ("local_*") tournaments have no server behind them, so their state
 * is mirrored to localStorage. This lets a refresh, a crash, or a trip to the
 * Home screen keep the tournament the user was scoring.
 */
const key = (id: string) => `pb_state_${id}`
const CURRENT_KEY = 'pb_localCurrentId'

export function isLocalId(id: string | null | undefined): boolean {
  return !!id && id.startsWith('local_')
}

export function saveLocalState(state: TournamentState): void {
  if (!isLocalId(state.tournamentId)) return
  try {
    localStorage.setItem(key(state.tournamentId!), JSON.stringify(getSerializableState(state)))
    localStorage.setItem(CURRENT_KEY, state.tournamentId!)
  } catch (e) {
    console.warn('[local] could not save offline tournament', e)
  }
}

export function loadLocalState(id: string, base: TournamentState): TournamentState | null {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(key(id))
  } catch {
    return null
  }
  if (!raw) return null
  try {
    const wire = JSON.parse(raw) as WireState
    return hydrateState({ ...base, tournamentId: id }, wire)
  } catch (e) {
    console.warn('[local] could not read offline tournament', e)
    return null
  }
}

export function deleteLocalState(id: string): void {
  try {
    localStorage.removeItem(key(id))
  } catch { /* ignore */ }
}
