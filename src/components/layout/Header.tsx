import { useState, useEffect } from 'react'
import { useTournament } from '../../context/TournamentContext'
import { SettingsModal } from './SettingsModal'
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
  const { state } = useTournament()
  const { wsStatus, wsStatusText, tournamentId, activePage, presenceCount } = state
  const [settingsOpen, setSettingsOpen] = useState(false)
  const now = useClock()
  const hasSession = !!tournamentId

  return (
    <header>
      <div className="header-brand">
        <div className="logo">Pickle<span>Bracket</span></div>
        <span className="phase-badge">{PAGE_LABELS[activePage] ?? activePage}</span>
        {hasSession && (
          <span className="header-session-id" title={tournamentId ?? ''}>
            {tournamentId}
          </span>
        )}
      </div>

      <div className="header-actions">
        <span className="header-clock">
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
          <span className="presence-badge">{presenceCount} online</span>
        )}

        <button
          className={`icon-btn gear-btn ${settingsOpen ? 'active' : ''}`}
          onClick={() => setSettingsOpen(true)}
          aria-label="Open settings"
          title="Settings"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1.08 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </header>
  )
}
