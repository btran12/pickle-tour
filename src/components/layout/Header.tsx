import { useTournament } from '../../context/TournamentContext'
import { useModal } from '../../context/ModalContext'
import { useTheme } from '../../hooks/useTheme'
import { exportCSV } from '../../utils/export'
import type { WsStatus } from '../../types'

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
  const { state, dispatch, createSession, resumeSession } = useTournament()
  const { openShare } = useModal()
  const { dark, toggleTheme } = useTheme()
  const { wsStatus, wsStatusText, tournamentId, role, activePage, presenceCount } = state
  const hasSession = !!tournamentId
  const lastTid = localStorage.getItem('pb_lastTournamentId')

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
        {wsStatus !== 'offline' && (
          <span className={indicatorClass(wsStatus)}>
            {wsStatusText || (wsStatus === 'connected' ? '● Live' : wsStatus)}
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

        {hasSession && role === 'admin' && (
          <>
            <button className="btn btn-sm btn-outline no-print" onClick={openShare}>🔗 Share</button>
            <button className="btn btn-sm btn-outline no-print" onClick={() => dispatch({ type: 'SET_PAGE', page: 'setup' })}>
              {PAGE_LABELS.setup}
            </button>
          </>
        )}

        <button className="btn btn-sm btn-outline no-print" onClick={() => exportCSV(state)} title="Export CSV">↓ CSV</button>
        <button className="btn btn-sm btn-outline no-print" onClick={() => dispatch({ type: 'SET_PAGE', page: 'bracket' })} title="Live View">📺 Live</button>
        <button className="btn btn-sm btn-outline no-print" onClick={toggleTheme} title="Toggle theme">
          {dark ? '☀' : '🌙'}
        </button>
        <button className="btn btn-sm btn-outline no-print" onClick={() => window.print()} title="Print">🖨</button>
      </div>
    </header>
  )
}
