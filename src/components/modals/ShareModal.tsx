import { useState } from 'react'
import { useTournament } from '../../context/TournamentContext'
import { useModal } from '../../context/ModalContext'

export function ShareModal() {
  const { state } = useTournament()
  const { shareOpen, closeShare } = useModal()
  const [copied, setCopied] = useState<string | null>(null)

  if (!shareOpen) return null

  const tid = state.tournamentId ?? ''
  const base = window.location.origin + window.location.pathname
  const adminUrl = `${base}?t=${tid}&role=admin`
  const viewUrl = `${base}?t=${tid}&role=viewer`

  const copy = (text: string, which: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(which)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  return (
    <div className="modal-overlay open" onClick={e => { if (e.target === e.currentTarget) closeShare() }}>
      <div className="modal">
        <div className="modal-title">Share Tournament</div>

        <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 6 }}><strong>Tournament ID</strong></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 10px', flex: 1 }}>{tid}</span>
          <button className="btn btn-outline btn-sm" onClick={() => copy(tid, 'id')}>{copied === 'id' ? '✓ Copied' : 'Copy ID'}</button>
        </div>

        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>Viewer Link</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input readOnly value={viewUrl} style={{ flex: 1, fontSize: 11 }} />
            <button className="btn btn-outline btn-sm" onClick={() => copy(viewUrl, 'view')}>{copied === 'view' ? '✓' : 'Copy'}</button>
          </div>
        </div>

        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>Admin Link</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input readOnly value={adminUrl} style={{ flex: 1, fontSize: 11 }} />
            <button className="btn btn-outline btn-sm" onClick={() => copy(adminUrl, 'admin')}>{copied === 'admin' ? '✓' : 'Copy'}</button>
          </div>
        </div>

        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8 }}>
          Bookmark the Admin Link or copy the ID — click <strong>↩ Resume</strong> on return to restore your tournament.
        </div>

        <div className="modal-actions">
          <button className="btn btn-outline" onClick={closeShare}>Close</button>
        </div>
      </div>
    </div>
  )
}
