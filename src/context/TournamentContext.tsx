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
    // Use stateSnap.role (not w.role) — w.role is synced asynchronously via useEffect and may
    // lag behind state.role by one render. If we send role:'viewer' the server rejects the update.
    if (stateSnap.role !== 'admin') {
      console.warn('[WS] broadcast skipped — not admin', { stateRole: stateSnap.role, wsRole: w.role })
      return
    }
    if (!w.connected || !w.socket || w.socket.readyState !== 1) {
      console.log('[WS] broadcast queued — not connected, will send on reconnect')
      w.pendingBroadcast = true
      return
    }
    clearTimeout(w.broadcastDebounce ?? undefined)
    w.broadcastDebounce = setTimeout(() => {
      if (!w.socket || w.socket.readyState !== 1) { w.pendingBroadcast = true; return }
      dispatch({ type: 'SET_WS_STATUS', status: 'syncing', text: '⟳ Syncing…' })
      const wireState = getSerializableState(stateSnap)
      const payload = JSON.stringify({ action: 'update', tournamentId: w.tournamentId, role: stateSnap.role, state: wireState })
      console.group(`[WS] ▲ SEND update — tid=${w.tournamentId}`)
      console.log('teams:', wireState.teams.length, wireState.teams.map(t => t.name))
      console.log('groups:', wireState.groups.map(g => `${g.name}(${g.teamIds.length})`).join(', '))
      console.log('rrMatches:', Object.entries(wireState.rrMatches).map(([gi, ms]) => `g${gi}:${ms.length}matches`).join(', '))
      console.log('bracketMatches:', wireState.bracketMatches.length)
      console.log('schedule:', Object.keys(wireState.schedule).length, 'entries')
      console.log('history:', wireState.history.length, 'entries')
      console.log('settings:', wireState.settings)
      console.log('wireState:', wireState)
      console.log('payload:', payload)
      console.groupEnd()
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

    // Clean up old socket — only close if OPEN (readyState 1), not CONNECTING (0).
    // Closing a CONNECTING socket triggers a browser error; nulling handlers abandons it silently.
    if (w.socket) {
      w.socket.onopen = null; w.socket.onmessage = null
      w.socket.onclose = null; w.socket.onerror = null
      if (w.socket.readyState === 1) w.socket.close()
      w.socket = null
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
      console.log(`[WS] ▲ SEND join — tid=${tournamentId} role=${role}`)
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
          console.group(`[WS] ▼ RECV init — role=${role} initialJoinComplete=${w.initialJoinComplete}`)
          console.log('server-assigned role:', msg.role)
          if (msg.state) {
            console.log('teams:', msg.state.teams.length, msg.state.teams.map(t => t.name))
            console.log('groups:', msg.state.groups.map(g => `${g.name}(${g.teamIds.length})`).join(', '))
            console.log('rrMatches:', Object.entries(msg.state.rrMatches).map(([gi, ms]) => `g${gi}:${ms.length}matches`).join(', '))
            console.log('bracketMatches:', msg.state.bracketMatches.length)
            console.log('full state:', msg.state)
          } else {
            console.log('no state payload')
          }
          console.groupEnd()
          // Do NOT apply msg.role — role is set from URL params or session helpers before connect().
          // Applying it here could cause a viewer to adopt 'admin' if the server echoes the
          // tournament creator's role, which would then cause update messages to be ignored.
          if (!w.initialJoinComplete) {
            if (msg.state) dispatch({ type: 'APPLY_REMOTE_STATE', wireState: msg.state })
            w.initialJoinComplete = true
          } else if (role === 'admin') {
            setTimeout(() => broadcast(stateRef.current), 200)
          } else {
            if (msg.state) dispatch({ type: 'APPLY_REMOTE_STATE', wireState: msg.state })
          }

        } else if (msg.action === 'update') {
          console.group(`[WS] ▼ RECV update — role=${role}`)
          if (msg.state) {
            console.log('teams:', msg.state.teams.length, msg.state.teams.map(t => t.name))
            console.log('groups:', msg.state.groups.map(g => `${g.name}(${g.teamIds.length})`).join(', '))
            console.log('rrMatches:', Object.entries(msg.state.rrMatches).map(([gi, ms]) => `g${gi}:${ms.length}matches`).join(', '))
            console.log('bracketMatches:', msg.state.bracketMatches.length)
            console.log('full state:', msg.state)
          }
          if (role === 'admin') {
            console.log('→ ignored (admin does not apply remote updates)')
          }
          console.groupEnd()
          if (role !== 'admin' && msg.state) {
            dispatch({ type: 'APPLY_REMOTE_STATE', wireState: msg.state })
          }

        } else if (msg.action === 'empty') {
          console.log(`[WS] ▼ RECV empty — role=${role}, server-assigned role=${msg.role}`)
          if (role === 'admin') setTimeout(() => broadcast(stateRef.current), 200)

        } else if (msg.action === 'error') {
          console.warn('[WS] ▼ RECV error:', msg.code, msg.message)
          if (msg.code === 'CONN_LIMIT') dispatch({ type: 'SHOW_TOAST', text: '⚠️ Tournament is full (max connections reached)' })

        } else if (msg.action === 'presence') {
          console.log(`[WS] ▼ RECV presence — count=${msg.count}`)
          dispatch({ type: 'SET_PRESENCE', count: msg.count ?? 0 })

        } else {
          console.log('[WS] ▼ RECV unknown action:', msg.action, msg)
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
    return () => {
      // Cleanup on unmount (also runs on React StrictMode double-invoke)
      const w = ws.current
      clearTimeout(w.reconnectTimer ?? undefined)
      clearInterval(w.pingInterval ?? undefined)
      w.reconnectTimer = null
      w.pingInterval = null
      if (w.socket) {
        w.socket.onopen = null; w.socket.onmessage = null
        w.socket.onclose = null; w.socket.onerror = null
        if (w.socket.readyState === 1) w.socket.close()
        w.socket = null
      }
      w.connected = false
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
