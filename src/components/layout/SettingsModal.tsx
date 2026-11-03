import { useEffect, type ReactNode } from 'react'
import { useTournament } from '../../context/TournamentContext'
import { useModal } from '../../context/ModalContext'
import { useTheme } from '../../hooks/useTheme'
import { useSessionActions } from '../../hooks/useSessionActions'
import { exportCSV } from '../../utils/export'

interface Props {
  open: boolean
  onClose: () => void
}

interface RowProps {
  icon: string
  label: string
  desc?: string
  onClick?: () => void
  disabled?: boolean
  trailing?: ReactNode
}

function Row({ icon, label, desc, onClick, disabled, trailing }: RowProps) {
  const content = (
    <>
      <span className="settings-row-icon" aria-hidden="true">{icon}</span>
      <span className="settings-row-text">
        <span className="settings-row-label">{label}</span>
        {desc && <span className="settings-row-desc">{desc}</span>}
      </span>
      {trailing}
    </>
  )

  if (!onClick) {
    return <div className="settings-row static">{content}</div>
  }

  return (
    <button className="settings-row" onClick={onClick} disabled={disabled}>
      {content}
    </button>
  )
}

export function SettingsModal({ open, onClose }: Props) {
  const { state, dispatch, createSession, resumeSession } = useTournament()
  const { openShare } = useModal()
  const { dark, toggleTheme } = useTheme()
  const { copySession, copying } = useSessionActions()
  const { tournamentId, role, testingMode, wsStatus, wsStatusText, presenceCount } = state

  const hasSession = !!tournamentId
  const isAdmin = role === 'admin'
  const lastTid = typeof localStorage === 'undefined' ? null : localStorage.getItem('pb_lastTournamentId')

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="modal-overlay open" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal settings-modal" role="dialog" aria-modal="true" aria-label="Settings">
        <div className="flex-row flex-between mb12" style={{ gap: 8 }}>
          <div className="modal-title" style={{ margin: 0 }}>Settings</div>
          <button className="icon-btn" onClick={onClose} aria-label="Close settings">✕</button>
        </div>

        {hasSession ? (
          <>
            <div className="settings-status">
              <span className={`sync-indicator ${wsStatus === 'connected' ? 'connected' : wsStatus === 'syncing' ? 'syncing' : wsStatus === 'error' ? 'error' : ''}`}>
                {wsStatus === 'connected' ? '● Live' : wsStatus === 'offline' ? 'Offline' : (wsStatusText || wsStatus)}
              </span>
              <span className="settings-id" title={tournamentId ?? ''}>{tournamentId}</span>
              {presenceCount > 1 && <span className="settings-presence">{presenceCount} online</span>}
            </div>

            <div className="settings-section">Share &amp; export</div>
            {isAdmin && (
              <Row
                icon="⧉"
                label={copying ? 'Copying…' : 'Copy tournament'}
                desc="Same setup, fresh groups and matches"
                disabled={copying || wsStatus === 'connecting'}
                onClick={async () => { onClose(); await copySession() }}
              />
            )}
            {isAdmin && (
              <Row
                icon="🔗"
                label="Share"
                desc="Viewer and admin links"
                onClick={() => { onClose(); openShare() }}
              />
            )}
            <Row icon="↓" label="Export CSV" desc="Results and standings" onClick={() => { onClose(); exportCSV(state) }} />
            <Row icon="🖨" label="Print" desc="Printable bracket and results" onClick={() => { onClose(); window.print() }} />
          </>
        ) : (
          <>
            <div className="settings-section">Session</div>
            <Row icon="＋" label="Create new tournament" desc="Host a synced tournament" onClick={() => { onClose(); createSession() }} />
            {lastTid && (
              <Row icon="↩" label="Resume last tournament" desc={lastTid} onClick={() => { onClose(); resumeSession() }} />
            )}
          </>
        )}

        <div className="settings-section">Options</div>
        <Row
          icon="🧪"
          label="Testing mode"
          desc="Tap a team to instantly record a win"
          onClick={() => dispatch({ type: 'SET_TESTING_MODE', enabled: !testingMode })}
          trailing={
            <span className={`switch ${testingMode ? 'on' : ''}`} role="switch" aria-checked={testingMode} aria-label="Testing mode">
              <span className="switch-knob" />
            </span>
          }
        />
        <Row
          icon={dark ? '🌙' : '🌤'}
          label="Dark mode"
          desc="Switch between light and dark"
          onClick={toggleTheme}
          trailing={
            <span className={`switch ${dark ? 'on' : ''}`} role="switch" aria-checked={dark} aria-label="Dark mode">
              <span className="switch-knob" />
            </span>
          }
        />
      </div>
    </div>
  )
}
