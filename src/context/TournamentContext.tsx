import { createContext, useContext, useReducer, useEffect, useRef, useCallback, type ReactNode } from 'react'
import type { TournamentState, WireState, Role } from '../types'
import { reducer, type Action } from './reducer'
import { initialState } from './initialState'
import { getSerializableState } from '../utils/serialization'
import { CONFIG } from '../config'
import { useTheme } from '../hooks/useTheme'

// ─── Context types ───────────────────────────────────

interface TournamentContextValue {
  state: TournamentState
  dispatch: React.Dispatch<Action>
  // Session helpers
  createSession: () => void
  resumeSession: () => void
  openById: (id: string) => void
}

const TournamentContext = createContext<TournamentContextValue | null>(null)

export function useTournament(): TournamentContextValue {
  const ctx = useContext(TournamentContext)
  if (!ctx) throw new Error('useTournament must be used inside TournamentProvider')
  return ctx
}

// ─── WebSocket refs (shared across renders) ──────────

interface WsRef {
  socket: WebSocket | null
  reconnectTimer: ReturnType<typeof setTimeout> | null
  reconnectDelay: number
  pingInterval: ReturnType<typeof setInterval> | null
  pendingBroadcast: boolean
  initialJoinComplete: boolean
  broadcastDebounce: ReturnType<typeof setTimeout> | null
  role: Role
  tournamentId: string | null
  connected: boolean
}

// ─── Provider ────────────────────────────────────────

export function TournamentProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  useTheme()

  const ws = useRef<WsRef>({
    socket: null,
    reconnectTimer: null,
    reconnectDelay: 2000,
    pingInterval: null,
    pendingBroadcast: false,
    initialJoinComplete: false,
    broadcastDebounce: null,
    role: 'viewer',
    tournamentId: null,
    connected: false,
  })

  // Keep ws.role and ws.tournamentId in sync with state
  useEffect(() => { ws.current.role = state.role }, [state.role])
  useEffect(() => { ws.current.tournamentId = state.tournamentId }, [state.tournamentId])

  // ── Broadcast (admin only, debounced 300ms) ─────────
  const broadcast = useCallback((stateSnap: TournamentState) => {
    const w = ws.current
    if (w.role !== 'admin') return
    if (!w.connected || !w.socket || w.socket.readyState !== 1) {
      w.pendingBroadcast = true
      return
    }
    clearTimeout(w.broadcastDebounce ?? undefined)
    w.broadcastDebounce = setTimeout(() => {
      if (!w.socket || w.socket.readyState !== 1) { w.pendingBroadcast = true; return }
      dispatch({ type: 'SET_WS_STATUS', status: 'syncing', text: '⟳ Syncing…' })
      const wireState = getSerializableState(stateSnap)
      const payload = JSON.stringify({ action: 'update', tournamentId: w.tournamentId, role: w.role, state: wireState })
      try {
        w.socket.send(payload)
        w.pendingBroadcast = false
        setTimeout(() => { if (w.connected) dispatch({ type: 'SET_WS_STATUS', status: 'connected', text: '● Live' }) }, 600)
      } catch (e) {
        w.pendingBroadcast = true
        console.warn('[WS] send failed', e)
        dispatch({ type: 'SET_WS_STATUS', status: 'error', text: '✕ Send failed' })
      }
    }, 300)
  }, [])

  // ── Auto-broadcast when tournament state changes ────
  const stateRef = useRef(state)
  useEffect(() => { stateRef.current = state }, [state])

  useEffect(() => {
    if (state.role !== 'admin') return
    broadcast(state)
  }, [
    state.role, state.teams, state.groups, state.rrMatches, state.bracketMatches,
    state.courts, state.schedule, state.settings, state.tType, state.bMethod,
    state.tournamentName, state.history, state.bracketSeedGroups,
    broadcast,
  ])

  // ── Connect ─────────────────────────────────────────
  const connect = useCallback((tournamentId: string, role: Role) => {
    const w = ws.current

    // Clean up old socket
    if (w.socket) {
      w.socket.onopen = null; w.socket.onmessage = null
      w.socket.onclose = null; w.socket.onerror = null
      if (w.socket.readyState <= 1) w.socket.close()
    }
    clearInterval(w.pingInterval ?? undefined)
    w.pingInterval = null
    w.initialJoinComplete = false

    dispatch({ type: 'SET_WS_STATUS', status: 'connecting', text: '⟳ Connecting…' })

    let socket: WebSocket
    try { socket = new WebSocket(CONFIG.WEBSOCKET_URL) }
    catch (e) { dispatch({ type: 'SET_WS_STATUS', status: 'error', text: '✕ Bad URL' }); return }

    w.socket = socket

    socket.onopen = () => {
      w.connected = true
      w.reconnectDelay = 2000
      clearTimeout(w.reconnectTimer ?? undefined)
      dispatch({ type: 'SET_WS_STATUS', status: 'connected', text: '● Live' })
      socket.send(JSON.stringify({ action: 'join', tournamentId, role }))

      if (w.pendingBroadcast) {
        w.pendingBroadcast = false
        setTimeout(() => broadcast(stateRef.current), 200)
      }
      w.pingInterval = setInterval(() => {
        if (socket.readyState === 1) {
          socket.send(JSON.stringify({ action: 'ping', tournamentId: w.tournamentId }))
        }
      }, 30000)
    }

    socket.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data as string) as {
          action: string; role?: Role; state?: WireState; count?: number; code?: string; message?: string
        }
        if (msg.action === 'init') {
          if (msg.role) dispatch({ type: 'SET_ROLE', role: msg.role })
          if (!w.initialJoinComplete) {
            if (msg.state) dispatch({ type: 'APPLY_REMOTE_STATE', wireState: msg.state })
            w.initialJoinComplete = true
          } else if (w.role === 'admin') {
            setTimeout(() => broadcast(stateRef.current), 200)
          } else {
            if (msg.state) dispatch({ type: 'APPLY_REMOTE_STATE', wireState: msg.state })
          }
        } else if (msg.action === 'update') {
          if (w.role !== 'admin' && msg.state) {
            dispatch({ type: 'APPLY_REMOTE_STATE', wireState: msg.state })
          }
        } else if (msg.action === 'empty') {
          if (msg.role) dispatch({ type: 'SET_ROLE', role: msg.role })
          if (w.role === 'admin') setTimeout(() => broadcast(stateRef.current), 200)
        } else if (msg.action === 'error') {
          console.warn('[WS] server error:', msg.code, msg.message)
          if (msg.code === 'CONN_LIMIT') dispatch({ type: 'SHOW_TOAST', text: '⚠️ Tournament is full (max connections reached)' })
        } else if (msg.action === 'presence') {
          dispatch({ type: 'SET_PRESENCE', count: msg.count ?? 0 })
        }
      } catch (e) { console.warn('[WS] parse error', e) }
    }

    socket.onclose = (evt) => {
      w.connected = false
      clearInterval(w.pingInterval ?? undefined)
      w.pingInterval = null
      console.log('[WS] onclose', evt.code, evt.wasClean)
      dispatch({ type: 'SET_WS_STATUS', status: 'error', text: '✕ Disconnected' })
      w.reconnectTimer = setTimeout(() => {
        connect(w.tournamentId!, w.role)
      }, w.reconnectDelay)
      w.reconnectDelay = Math.min(w.reconnectDelay * 2, 30000)
    }

    socket.onerror = () => dispatch({ type: 'SET_WS_STATUS', status: 'error', text: '✕ Error' })
  }, [broadcast])

  // ── Check URL params on mount ────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const tid = params.get('t')
    const role = (params.get('role') as Role) || 'viewer'
    if (tid) {
      dispatch({ type: 'SET_TOURNAMENT_ID', id: tid })
      dispatch({ type: 'SET_ROLE', role })
      if (role === 'admin') localStorage.setItem('pb_lastTournamentId', tid)
      connect(tid, role)
    }
  }, [connect])

  // ── Session helpers ──────────────────────────────────
  const activateSession = useCallback((tid: string) => {
    dispatch({ type: 'SET_TOURNAMENT_ID', id: tid })
    dispatch({ type: 'SET_ROLE', role: 'admin' })
    localStorage.setItem('pb_lastTournamentId', tid)
    const url = new URL(window.location.href)
    url.searchParams.set('t', tid); url.searchParams.set('role', 'admin')
    window.history.replaceState({}, '', url.toString())
  }, [])

  const createSession = useCallback(() => {
    const tid = 'pb_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
    activateSession(tid)
    connect(tid, 'admin')
    dispatch({ type: 'SHOW_TOAST', text: '☁ Creating tournament…' })
  }, [activateSession, connect])

  const resumeSession = useCallback(() => {
    const tid = localStorage.getItem('pb_lastTournamentId')
    if (!tid) return
    activateSession(tid)
    connect(tid, 'admin')
    dispatch({ type: 'SHOW_TOAST', text: '↩ Resuming tournament…' })
  }, [activateSession, connect])

  const openById = useCallback((id: string) => {
    activateSession(id)
    connect(id, 'admin')
    dispatch({ type: 'SHOW_TOAST', text: '🔗 Loading tournament…' })
  }, [activateSession, connect])

  return (
    <TournamentContext.Provider value={{ state, dispatch, createSession, resumeSession, openById }}>
      {children}
    </TournamentContext.Provider>
  )
}
