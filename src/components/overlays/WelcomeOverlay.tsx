import { useState } from 'react'
import { useTournament } from '../../context/TournamentContext'
import { useConfirm } from '../../context/ConfirmContext'
import { getSavedTournaments, removeSavedTournament, type SavedTournament } from '../../utils/tournamentHistory'

function fmtWhen(ts: number): string {
  if (!ts) return 'saved earlier'
  const diff = Date.now() - ts
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hrs = Math.floor(min / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(ts).toLocaleDateString()
}

export function WelcomeOverlay() {
  const { createSession, openById, dispatch } = useTournament()
  const confirm = useConfirm()
  const [idInput, setIdInput] = useState('')
  const [saved, setSaved] = useState<SavedTournament[]>(() => getSavedTournaments())

  const forget = async (t: SavedTournament) => {
    const ok = await confirm({
      title: 'Forget Tournament',
      message: `Remove "${t.name}" from your list? The tournament itself is not deleted.`,
      confirmLabel: 'Remove',
      danger: true,
    })
    if (!ok) return
    removeSavedTournament(t.id)
    setSaved(getSavedTournaments())
  }

  return (
    <div className="welcome-overlay">
      <div className="welcome-card">
        <div className="logo" style={{ fontSize: 32, marginBottom: 4 }}>Pickle<span>Bracket</span></div>
        <div style={{ fontSize: 14, color: 'var(--text3)', marginBottom: 24 }}>Tournament management for pickleball</div>

        <button className="btn btn-primary btn-full" style={{ marginBottom: 10 }} onClick={createSession}>
          ＋ Create New Tournament
        </button>

        {saved.length > 0 && (
          <div className="saved-section">
            <div className="saved-section-title">Your Tournaments</div>
            <div className="saved-list">
              {saved.map(t => (
                <div key={t.id} className="saved-item">
                  <button
                    type="button"
                    className="saved-item-main"
                    onClick={() => openById(t.id)}
                    title={`Open ${t.name}`}
                  >
                    <span className="saved-item-name">
                      <span className="saved-item-name-text">{t.name}</span>
                      <span className={`saved-role ${t.role}`}>{t.role === 'admin' ? 'Host' : 'Viewer'}</span>
                    </span>
                    <span className="saved-item-id">{t.id}</span>
                    <span className="saved-item-meta">Last opened {fmtWhen(t.lastVisited)}</span>
                  </button>
                  <div className="saved-item-actions">
                    <button className="btn btn-primary btn-sm" onClick={() => openById(t.id)}>Open</button>
                    <button
                      className="btn btn-ghost btn-sm saved-item-remove"
                      title="Remove from list"
                      onClick={() => forget(t)}
                    >✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ fontSize: 12, color: 'var(--text3)', margin: '16px 0 8px', textAlign: 'center' }}>
          — or join an existing tournament —
        </div>
        <div style={{ display: 'flex', gap: 7 }}>
          <input
            type="text"
            placeholder="Paste Tournament ID…"
            value={idInput}
            onChange={e => setIdInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && idInput.trim()) openById(idInput.trim()) }}
          />
          <button
            className="btn btn-outline"
            disabled={!idInput.trim()}
            onClick={() => openById(idInput.trim())}
          >
            Join
          </button>
        </div>

        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 18, textAlign: 'center' }}>
          You can also use the app offline — just skip the live session
        </div>
        <button
          className="btn btn-ghost btn-full"
          style={{ marginTop: 8 }}
          onClick={() => {
            dispatch({ type: 'SET_ROLE', role: 'admin' })
            dispatch({ type: 'SET_TOURNAMENT_ID', id: 'local_' + Date.now() })
            dispatch({ type: 'SET_PAGE', page: 'setup' })
          }}
        >
          Use Offline (no sync)
        </button>
      </div>
    </div>
  )
}
