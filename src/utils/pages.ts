import type { Page } from '../types'

/** Tab order used by the nav bar and by swipe navigation. */
export const PAGES: { id: Page; label: string }[] = [
  { id: 'setup', label: 'Setup' },
  { id: 'players', label: 'Players' },
  { id: 'teams', label: 'Teams' },
  { id: 'groups', label: 'Groups' },
  { id: 'schedule', label: 'Courts' },
  { id: 'roundrobin', label: 'Round Robin' },
  { id: 'bracket', label: 'Bracket' },
  { id: 'history', label: 'History' },
]
