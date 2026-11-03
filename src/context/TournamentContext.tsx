import { createContext, useContext, useReducer, useEffect, useRef, useCallback, type ReactNode } from 'react'
import type { TournamentState, WireState, Role } from '../types'
import { reducer, type Action } from './reducer'
import { initialState } from './initialState'
import { getSerializableState } from '../utils/serialization'
import { saveTournament, getSavedTournament, getLastTournamentId } from '../utils/tournamentHistory'
import { CONFIG } from '../config'
import { useTheme } from '../hooks/useTheme'

// ─── Context types ───────────────────────────────────

interface TournamentContextValue {
  state: TournamentState
  dispatch: React.Dispatch<Action>
  createSession: () => void
  resumeSession: () => void
  openById: (id: string) => void
  goHome: () => void
}

const TournamentContext = createContext<TournamentContextValue | null>(null)

export function useTournament(): TournamentContextValue {
  const ctx = useContext(TournamentContext)
  if (!ctx) throw new Error('useTournament must be used inside TournamentProvider')
  return ctx
}

// ─── Provider ────────────────────────────────────────

export function TournamentProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  useTheme()

  const lastKnownUpdatedAt = useRef<string | null>(null)
  const skipSave = useRef(false)
  const sessionReady = useRef(false)
  const stateRef = useRef(state)
  stateRef.current = state
  const saveDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Save to server (debounced 500ms) ──────────────────
  const save = useCallback((stateSnap: TournamentState) => {
    const tid = stateSnap.tournamentId
    if (!tid || tid.startsWith('local_')) return
    clearTimeout(saveDebounce.current ?? undefined)
    saveDebounce.current = setTimeout(async () => {
      dispatch({ type: 'SET_WS_STATUS', status: 'syncing', text: '⟳ Saving…' })
      try {
        const res = await fetch(`${CONFIG.API_URL}/tournaments/${tid}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ state: getSerializableState(stateSnap) }),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const { updatedAt } = await res.json() as { updatedAt: string }
        lastKnownUpdatedAt.current = updatedAt
        dispatch({ type: 'SET_WS_STATUS', status: 'connected', text: '✓ Saved' })
      } catch (e) {
        console.warn('[API] save failed', e)
        dispatch({ type: 'SET_WS_STATUS', status: 'error', text: '✕ Save failed' })
      }
    }, 500)
  }, [])

  // ── Auto-save on state changes ────────────────────────
  // skipSave prevents re-saving state that just arrived from the server
  useEffect(() => {
    if (!state.tournamentId) return
    if (!sessionReady.current) return
    if (skipSave.current) { skipSave.current = false; return }
    save(state)
  }, [
    state.teams, state.players, state.groups, state.rrMatches, state.bracketMatches,
    state.courts, state.schedule, state.settings, state.tType, state.bMethod,
    state.tournamentName, state.history, state.bracketSeedGroups,
    save,
  ])

  // ── Keep a local history of created/joined tournaments ──
  useEffect(() => {
    if (!state.tournamentId) return
    saveTournament({
      id: state.tournamentId,
      name: state.tournamentName,
      role: state.role,
      lastVisited: Date.now(),
    })
  }, [state.tournamentId, state.tournamentName, state.role])

  // ── Poll server for remote changes every 2s ──────────
  useEffect(() => {
    const tid = state.tournamentId
    if (!tid || tid.startsWith('local_')) return

    let isFirst = true

    const fetchState = async () => {
      try {
        const res = await fetch(`${CONFIG.API_URL}/tournaments/${tid}`)
        if (res.status === 404) {
          // New tournament — no state on server yet, nothing to apply
          if (isFirst) { isFirst = false; dispatch({ type: 'SET_WS_STATUS', status: 'connected', text: '● Live' }) }
          if (!sessionReady.current) {
            sessionReady.current = true
            save(stateRef.current)
          }
          return
        }
        if (!res.ok) {
          if (isFirst) dispatch({ type: 'SET_WS_STATUS', status: 'error', text: '✕ Load failed' })
          return
        }
        const { state: wireState, updatedAt } = await res.json() as { state: WireState; updatedAt: string }
        if (isFirst) { isFirst = false; dispatch({ type: 'SET_WS_STATUS', status: 'connected', text: '● Live' }) }
        if (updatedAt === lastKnownUpdatedAt.current) return  // no change since last fetch/save
        lastKnownUpdatedAt.current = updatedAt
        sessionReady.current = true
        skipSave.current = true
        dispatch({ type: 'APPLY_REMOTE_STATE', wireState })
      } catch (e) {
        console.warn('[API] poll failed', e)
        if (isFirst) dispatch({ type: 'SET_WS_STATUS', status: 'error', text: '✕ Load failed' })
      }
    }

    fetchState()
    const interval = setInterval(fetchState, CONFIG.POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [state.tournamentId])

  // ── Check URL params on mount ────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const tid = params.get('t')
    if (tid) {
      const role = params.get('role') === 'admin' ? 'admin' : 'viewer'
      lastKnownUpdatedAt.current = null
      sessionReady.current = false
      dispatch({ type: 'SET_TOURNAMENT_ID', id: tid })
      dispatch({ type: 'SET_ROLE', role })
      dispatch({ type: 'SET_WS_STATUS', status: 'connecting', text: '⟳ Loading…' })
    }
  }, [])

  // ── Session helpers ──────────────────────────────────
  const activateSession = useCallback((tid: string, role: Role = 'admin') => {
    lastKnownUpdatedAt.current = null
    sessionReady.current = false
    dispatch({ type: 'RESET_TOURNAMENT' })
    dispatch({ type: 'SET_TOURNAMENT_ID', id: tid })
    dispatch({ type: 'SET_ROLE', role })
    dispatch({ type: 'SET_WS_STATUS', status: 'connecting', text: '⟳ Loading…' })
    const url = new URL(window.location.href)
    url.searchParams.set('t', tid)
    url.searchParams.set('role', role)
    window.history.replaceState({}, '', url.toString())
  }, [])

  const createSession = useCallback(() => {
    const tid = 'pb_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
    activateSession(tid, 'admin')
    dispatch({ type: 'SHOW_TOAST', text: '☁ Creating tournament…' })
  }, [activateSession])

  const resumeSession = useCallback(() => {
    const tid = getLastTournamentId()
    if (!tid) return
    activateSession(tid, getSavedTournament(tid)?.role ?? 'admin')
    dispatch({ type: 'SHOW_TOAST', text: '↩ Resuming tournament…' })
  }, [activateSession])

  const openById = useCallback((id: string) => {
    activateSession(id, getSavedTournament(id)?.role ?? 'admin')
    dispatch({ type: 'SHOW_TOAST', text: '🔗 Loading tournament…' })
  }, [activateSession])

  const goHome = useCallback(() => {
    lastKnownUpdatedAt.current = null
    sessionReady.current = false
    dispatch({ type: 'RESET_TOURNAMENT' })
    const url = new URL(window.location.href)
    url.searchParams.delete('t')
    url.searchParams.delete('role')
    window.history.replaceState({}, '', url.toString())
  }, [])

  return (
    <TournamentContext.Provider value={{ state, dispatch, createSession, resumeSession, openById, goHome }}>
      {children}
    </TournamentContext.Provider>
  )
}
