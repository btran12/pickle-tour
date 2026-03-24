import { useEffect } from 'react'
import { useTournament } from '../../context/TournamentContext'

export function JoinToast() {
  const { state, dispatch } = useTournament()
  const { toast } = state

  useEffect(() => {
    if (!toast) return
    const id = toast.id
    const timer = setTimeout(() => dispatch({ type: 'CLEAR_TOAST', id }), 3000)
    return () => clearTimeout(timer)
  }, [toast, dispatch])

  if (!toast) return null

  return (
    <div style={{
      position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
      background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 'var(--r2)',
      padding: '10px 20px', fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 500,
      color: 'var(--text)', boxShadow: '0 4px 20px rgba(0,0,0,.2)', zIndex: 999,
      animation: 'fadeIn .2s ease',
    }}>
      {toast.text}
    </div>
  )
}
