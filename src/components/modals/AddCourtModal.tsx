import { useState, useRef, useEffect } from 'react'
import { useTournament } from '../../context/TournamentContext'
import { useModal } from '../../context/ModalContext'

export function AddCourtModal() {
  const { dispatch } = useTournament()
  const { addCourtOpen, closeAddCourt } = useModal()
  const [name, setName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (addCourtOpen) { setName(''); setTimeout(() => inputRef.current?.focus(), 50) }
  }, [addCourtOpen])

  if (!addCourtOpen) return null

  const handleSubmit = () => {
    if (!name.trim()) { alert('Enter a court name.'); return }
    dispatch({ type: 'ADD_COURT', name: name.trim() })
    closeAddCourt()
  }

  return (
    <div className="modal-overlay open" onClick={e => { if (e.target === e.currentTarget) closeAddCourt() }}>
      <div className="modal">
        <div className="modal-title">Add Court</div>
        <div className="form-row">
          <label>Court Name</label>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Court 1"
            onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
          />
        </div>
        <div className="modal-actions">
          <button className="btn btn-outline" onClick={closeAddCourt}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit}>Add Court</button>
        </div>
      </div>
    </div>
  )
}
