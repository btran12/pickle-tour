import { useState } from 'react'
import { useTournament } from '../../context/TournamentContext'

export function WelcomeOverlay() {
  const { createSession, openById, resumeSession, dispatch } = useTournament()
  const [idInput, setIdInput] = useState('')
  const lastTid = localStorage.getItem('pb_lastTournamentId')

  return (
    <div className="welcome-overlay">
      <div className="welcome-card">
        <div className="logo" style={{ fontSize: 32, marginBottom: 4 }}>Pickle<span>Bracket</span></div>
        <div style={{ fontSize: 14, color: 'var(--text3)', marginBottom: 24 }}>Tournament management for pickleball</div>

        <button className="btn btn-primary btn-full" style={{ marginBottom: 10 }} onClick={createSession}>
          ☁ Create Live Tournament
        </button>

        {lastTid && (
          <button className="btn btn-outline btn-full" style={{ marginBottom: 10 }} onClick={resumeSession} title={lastTid}>
            ↩ Resume Last Tournament
          </button>
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
          onClick={() => dispatch({ type: 'SET_TOURNAMENT_ID', id: 'local_' + Date.now() })}
        >
          Use Offline (no sync)
        </button>
      </div>
    </div>
  )
}
