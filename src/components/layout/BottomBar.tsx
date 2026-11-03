import { useTournament } from '../../context/TournamentContext'
import { useModal } from '../../context/ModalContext'
import { useSessionActions } from '../../hooks/useSessionActions'

/**
 * Floating glass navigation bar pinned to the bottom of the screen.
 * Starts with Home and Live view; more entries can be added to `items` as
 * pages graduate into the bar.
 */
export function BottomBar() {
  const { state } = useTournament()
  const { liveOpen, openLive } = useModal()
  const { leaveSession } = useSessionActions()

  if (state.role === 'viewer' || !state.tournamentId) return null

  const items = [
    {
      id: 'home',
      label: 'Home',
      ariaLabel: 'Go to tournaments home',
      onClick: leaveSession,
      active: false,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5.5 9.5V21h13V9.5" />
          <path d="M10 21v-5.5h4V21" />
        </svg>
      ),
    },
    {
      id: 'live',
      label: 'Live',
      ariaLabel: 'Open live view',
      onClick: openLive,
      active: liveOpen,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="2.2" />
          <path d="M7.8 7.8a6 6 0 0 0 0 8.4" />
          <path d="M16.2 7.8a6 6 0 0 1 0 8.4" />
          <path d="M4.9 4.9a10 10 0 0 0 0 14.2" />
          <path d="M19.1 4.9a10 10 0 0 1 0 14.2" />
        </svg>
      ),
    },
  ]

  return (
    <div className="bottom-bar no-print" role="navigation" aria-label="Quick navigation">
      <div className="bottom-bar-inner">
        {items.map(item => (
          <button
            key={item.id}
            type="button"
            className={`bottom-bar-item ${item.active ? 'active' : ''}`}
            onClick={item.onClick}
            aria-label={item.ariaLabel}
            aria-pressed={item.id === 'live' ? item.active : undefined}
          >
            <span className="bottom-bar-icon">{item.icon}</span>
            <span className="bottom-bar-label">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
