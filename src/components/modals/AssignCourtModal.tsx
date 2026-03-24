import { useState, useEffect } from 'react'
import { useTournament } from '../../context/TournamentContext'
import { useModal } from '../../context/ModalContext'

export function AssignCourtModal() {
  const { state, dispatch } = useTournament()
  const { assignCtx, closeAssignCourt } = useModal()
  const { courts, schedule } = state

  const cur = assignCtx ? (schedule[assignCtx.matchId] ?? {}) : {}
  const [courtId, setCourtId] = useState('')
  const [time, setTime] = useState('09:00')

  useEffect(() => {
    if (!assignCtx) return
    const sc = schedule[assignCtx.matchId]
    setCourtId(sc ? String(sc.courtId) : (courts[0] ? String(courts[0].id) : ''))
    setTime(sc?.time ?? '09:00')
  }, [assignCtx?.matchId])

  if (!assignCtx) return null

  const handleSubmit = () => {
    if (!courtId) return
    dispatch({ type: 'ASSIGN_COURT', matchId: assignCtx.matchId, courtId: parseInt(courtId), time })
    closeAssignCourt()
  }

  return (
    <div className="modal-overlay open" onClick={e => { if (e.target === e.currentTarget) closeAssignCourt() }}>
      <div className="modal">
        <div className="modal-title">Assign Court</div>
        <div className="form-row">
          <label>Court</label>
          <select value={courtId} onChange={e => setCourtId(e.target.value)}>
            {courts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="form-row">
          <label>Time</label>
          <input type="time" value={time} onChange={e => setTime(e.target.value)} />
        </div>
        <div className="modal-actions">
          <button className="btn btn-outline" onClick={closeAssignCourt}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit}>Assign</button>
        </div>
      </div>
    </div>
  )
}
