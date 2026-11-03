import { useEffect, useRef } from 'react'
import { useTournament } from '../../context/TournamentContext'
import type { Page } from '../../types'

const PAGES: { id: Page; label: string }[] = [
  { id: 'setup', label: 'Setup' },
  { id: 'players', label: 'Players' },
  { id: 'teams', label: 'Teams' },
  { id: 'groups', label: 'Groups' },
  { id: 'schedule', label: 'Courts' },
  { id: 'roundrobin', label: 'Round Robin' },
  { id: 'bracket', label: 'Bracket' },
  { id: 'history', label: 'History' },
]

export function NavBar() {
  const { state, dispatch } = useTournament()
  const { activePage, role, testingMode } = state
  const activeRef = useRef<HTMLButtonElement | null>(null)

  // The nav scrolls horizontally on small screens — keep the active tab visible.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest', inline: 'center' })
  }, [activePage])

  if (role === 'viewer') return null

  return (
    <nav>
      {PAGES.map(p => (
        <button
          key={p.id}
          ref={activePage === p.id ? activeRef : undefined}
          data-page={p.id}
          className={activePage === p.id ? 'active' : ''}
          onClick={() => dispatch({ type: 'SET_PAGE', page: p.id })}
        >
          {p.label}
        </button>
      ))}
      <button
        className="testing-toggle"
        style={{
          marginLeft: 'auto',
          padding: '6px 12px',
          fontSize: 12,
          fontWeight: 600,
          borderRadius: 4,
          border: `1.5px solid ${testingMode ? 'var(--accent)' : 'var(--border2)'}`,
          background: testingMode ? 'var(--accent-dim)' : 'transparent',
          color: testingMode ? 'var(--accent)' : 'var(--text3)',
          cursor: 'pointer',
          transition: 'all 0.15s',
        }}
        onClick={() => dispatch({ type: 'SET_TESTING_MODE', enabled: !testingMode })}
      >
        {testingMode ? '🧪 Testing ON' : '🧪 Testing'}
      </button>
    </nav>
  )
}
