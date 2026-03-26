import { useTournament } from '../../context/TournamentContext'
import type { Page } from '../../types'

const PAGES: { id: Page; label: string }[] = [
  { id: 'setup', label: 'Setup' },
  { id: 'teams', label: 'Teams' },
  { id: 'players', label: 'Players' },
  { id: 'groups', label: 'Groups' },
  { id: 'schedule', label: 'Courts' },
  { id: 'roundrobin', label: 'Round Robin' },
  { id: 'bracket', label: 'Bracket' },
  { id: 'history', label: 'History' },
]

export function NavBar() {
  const { state, dispatch } = useTournament()
  const { activePage, role, testingMode } = state

  if (role === 'viewer') return null

  return (
    <nav>
      {PAGES.map(p => (
        <button
          key={p.id}
          data-page={p.id}
          className={activePage === p.id ? 'active' : ''}
          onClick={() => dispatch({ type: 'SET_PAGE', page: p.id })}
        >
          {p.label}
        </button>
      ))}
      <button
        style={{
          marginLeft: 'auto',
          padding: '6px 12px',
          fontSize: 12,
          fontWeight: 600,
          borderRadius: 4,
          border: `1.5px solid ${testingMode ? 'var(--accent)' : 'var(--border2)'}`,
          background: testingMode ? 'rgba(37,99,235,.1)' : 'transparent',
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
