import { useState, useEffect } from 'react'
import { useTournament } from '../../context/TournamentContext'
import { useModal } from '../../context/ModalContext'
import { useConfirm } from '../../context/ConfirmContext'
import { useTheme } from '../../hooks/useTheme'
import { exportCSV } from '../../utils/export'
import type { WsStatus } from '../../types'

function useClock() {
  const [time, setTime] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return time
}

const PAGE_LABELS: Record<string, string> = {
  setup: 'Setup', teams: 'Teams', players: 'Players', groups: 'Groups',
  schedule: 'Courts', roundrobin: 'Round Robin', bracket: 'Bracket', history: 'History',
}

function indicatorClass(status: WsStatus): string {
  if (status === 'connected') return 'sync-indicator connected'
  if (status === 'syncing') return 'sync-indicator syncing'
  if (status === 'error') return 'sync-indicator error'
  return 'sync-indicator'
}

export function Header() {
  const { state, dispatch, createSession, resumeSession, goHome } = useTournament()
  const { openShare } = useModal()
  const confirm = useConfirm()
  const { dark, toggleTheme } = useTheme()
  const { wsStatus, wsStatusText, tournamentId, role, activePage, presenceCount } = state
  const now = useClock()
  const hasSession = !!tournamentId
  const lastTid = localStorage.getItem('pb_lastTournamentId')

  const leaveSession = async () => {
    if (tournamentId?.startsWith('local_')) {
      const ok = await confirm({
        title: 'Leave Offline Tournament',
        message: 'Offline tournaments are not saved. Go home and lose your changes?',
        confirmLabel: 'Go Home',
        danger: true,
      })
      if (!ok) return
    }
    goHome()
  }

  return (
    <header>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div className="logo">Pickle<span>Bracket</span></div>
        <span className="phase-badge">{PAGE_LABELS[activePage] ?? activePage}</span>
        {hasSession && (
          <span
            style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: 'var(--text3)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            title={tournamentId ?? ''}
          >
            {tournamentId}
          </span>
        )}
      </div>

      <div className="header-actions">
        <span className="header-clock" style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, color: 'var(--text2)', letterSpacing: 1 }}>
          {now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
        {wsStatus !== 'offline' && (
          <span className={indicatorClass(wsStatus)} style={wsStatus === 'connected' ? { display: 'flex', alignItems: 'center', gap: 6 } : undefined}>
            {wsStatus === 'connected'
              ? <><span className="live-dot" /><span style={{ color: 'var(--red)', fontWeight: 700 }}>LIVE</span></>
              : (wsStatusText || wsStatus)
            }
          </span>
        )}
        {presenceCount > 1 && (
          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: 'var(--text3)', background: 'var(--surface2)', border: '1px solid var(--border)', padding: '3px 8px', borderRadius: 99 }}>
            {presenceCount} online
          </span>
        )}

        {!hasSession && (
          <>
            {lastTid && (
              <button className="btn btn-sm btn-outline no-print" onClick={resumeSession} title={lastTid}>↩ Resume</button>
            )}
            <button className="btn btn-sm btn-primary no-print" onClick={createSession}>☁ Go Live</button>
          </>
        )}

        {hasSession && (
          <button className="btn btn-sm btn-outline no-print" onClick={leaveSession} title="Back to tournaments">
            ⌂ Home
          </button>
        )}

        {hasSession && role === 'admin' && (
          <>
            <button className="btn btn-sm btn-outline no-print" onClick={openShare}>🔗 Share</button>
            <button className="btn btn-sm btn-outline no-print" onClick={() => dispatch({ type: 'SET_PAGE', page: 'setup' })}>
              {PAGE_LABELS.setup}
            </button>
          </>
        )}

        <button className="btn btn-sm btn-outline no-print no-mobile" onClick={() => exportCSV(state)} title="Export CSV">↓ CSV</button>
        <button className="btn btn-sm btn-outline no-print" onClick={() => dispatch({ type: 'SET_PAGE', page: 'bracket' })} title="Live View">📺 Live</button>
        <button className="btn btn-sm btn-outline no-print" onClick={toggleTheme} title="Toggle theme">
          {dark ? '☀' : '🌙'}
        </button>
        <button className="btn btn-sm btn-outline no-print no-mobile" onClick={() => window.print()} title="Print">🖨</button>
      </div>
    </header>
  )
}
