import { useState } from 'react'
import { useTournament } from '../../context/TournamentContext'
import { useModal } from '../../context/ModalContext'
import { allMatchesFlat } from '../../context/reducer'
import { fmtTime } from '../../utils/scoring'

export function CourtsPage() {
  const { state, dispatch } = useTournament()
  const { openAddCourt, openAssignCourt } = useModal()
  const { courts, schedule, settings } = state
  const [startTime, setStartTime] = useState('09:00')

  const matches = allMatchesFlat(state)

  // Build court → slots map
  const byCourt: Record<number, { m: typeof matches[0]; time: string }[]> = {}
  courts.forEach(c => { byCourt[c.id] = [] })
  matches.forEach(m => {
    const sc = schedule[m.id]
    if (sc && byCourt[sc.courtId]) byCourt[sc.courtId].push({ m, time: sc.time })
  })

  return (
    <div>
      <div className="section-title">Courts</div>
      <div className="section-sub">Manage courts and schedule matches</div>

      <div className="grid-2 mb12">
        <div className="card">
          <div className="card-title">Courts</div>
          {courts.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text3)' }}>No courts yet</div>
          ) : (
            courts.map(c => (
              <div key={c.id} className="flex-row flex-between" style={{ padding: '4px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                <span style={{ color: 'var(--purple)' }}>{c.name}</span>
                <button className="btn btn-ghost btn-sm no-print" onClick={() => dispatch({ type: 'REMOVE_COURT', id: c.id })}>✕</button>
              </div>
            ))
          )}
          <div style={{ marginTop: 10 }}>
            <button className="btn btn-outline btn-sm no-print" onClick={openAddCourt}>+ Add Court</button>
          </div>
        </div>

        <div className="card">
          <div className="card-title">Auto-Schedule</div>
          <div className="form-row">
            <label>Start Time</label>
            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
          </div>
          <button
            className="btn btn-primary btn-sm no-print"
            disabled={courts.length === 0 || matches.filter(m => m.status !== 'done').length === 0}
            onClick={() => dispatch({ type: 'AUTO_SCHEDULE', startTime })}
          >
            Auto-Schedule Matches
          </button>
        </div>
      </div>

      {courts.length === 0 ? (
        <div className="empty-state">
          <div className="ei">🏟</div>
          <strong>No courts added</strong>
          Add courts then click Auto-Schedule
        </div>
      ) : (
        <div className="schedule-grid">
          {courts.map(c => {
            const slots = (byCourt[c.id] ?? []).sort((a, b) => a.time.localeCompare(b.time))
            return (
              <div key={c.id} className="court-card">
                <div className="court-header">
                  <div className="court-name">{c.name}</div>
                  <span style={{ fontSize: 12, color: 'var(--text3)' }}>{slots.length} match{slots.length !== 1 ? 'es' : ''}</span>
                </div>
                {slots.length === 0 ? (
                  <div className="court-slot empty-slot">No matches assigned</div>
                ) : (
                  slots.map(({ m, time }) => {
                    const isDone = m.status === 'done'
                    const ta = (m.teamA as { name: string } | null)?.name ?? 'TBD'
                    const tb = (m.teamB as { name: string } | null)?.name ?? 'TBD'
                    return (
                      <div key={m.id} className="court-slot" style={isDone ? { opacity: .6 } : undefined}>
                        <div className="court-slot-time">{fmtTime(time)} · {settings.matchDuration} min</div>
                        <div className="court-slot-match">{ta} <span style={{ color: 'var(--text3)' }}>vs</span> {tb}</div>
                        <div style={{ display: 'flex', gap: 5, marginTop: 4, flexWrap: 'wrap' }}>
                          {isDone && <span style={{ fontSize: 11, color: 'var(--accent)' }}>✓ Done</span>}
                          <button
                            className="btn btn-ghost btn-sm no-print"
                            style={{ padding: '1px 7px', fontSize: 11 }}
                            onClick={() => openAssignCourt(m.id)}
                          >✏ Reassign</button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
