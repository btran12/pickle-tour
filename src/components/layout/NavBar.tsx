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
  const { activePage, role } = state

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
    </nav>
  )
}
