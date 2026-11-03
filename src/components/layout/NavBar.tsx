import { useEffect, useRef } from 'react'
import { useTournament } from '../../context/TournamentContext'
import { PAGES } from '../../utils/pages'

export function NavBar() {
  const { state, dispatch } = useTournament()
  const { activePage, role } = state
  const navRef = useRef<HTMLElement | null>(null)
  const activeRef = useRef<HTMLButtonElement | null>(null)

  // The nav scrolls horizontally on small screens — keep the active tab visible
  // without nudging the page itself.
  useEffect(() => {
    const nav = navRef.current
    const btn = activeRef.current
    if (!nav || !btn) return
    const navRect = nav.getBoundingClientRect()
    const btnRect = btn.getBoundingClientRect()
    const pad = 16
    if (btnRect.left < navRect.left + pad) {
      nav.scrollLeft -= (navRect.left + pad) - btnRect.left
    } else if (btnRect.right > navRect.right - pad) {
      nav.scrollLeft += btnRect.right - (navRect.right - pad)
    }
  }, [activePage])

  if (role === 'viewer') return null

  return (
    <nav ref={navRef}>
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
    </nav>
  )
}
