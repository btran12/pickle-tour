import { useState, useEffect, useRef } from 'react'
import { useTournament } from '../../context/TournamentContext'
import { useModal } from '../../context/ModalContext'
import { useConfirm } from '../../context/ConfirmContext'

const SKILL_OPTS = [
  { value: '', label: 'Not specified' },
  { value: '1', label: '2.0 — Beginner' },
  { value: '2', label: '2.5–3.0 — Intermediate' },
  { value: '3', label: '3.5 — Solid' },
  { value: '4', label: '4.0 — Advanced' },
  { value: '5', label: '4.5+ — Elite' },
]

export function AddEditPlayerModal() {
  const { state, dispatch } = useTournament()
  const { addPlayerOpen, editPlayerId, closePlayerModal } = useModal()
  const confirm = useConfirm()
  const { players, tType } = state
  const isEdit = editPlayerId !== null
  const existing = isEdit ? players.find(p => p.id === editPlayerId) : null
  const nameRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState('')
  const [skill, setSkill] = useState('')

  useEffect(() => {
    if (!addPlayerOpen) return
    setName(existing?.name ?? '')
    setSkill(String(existing?.skill ?? ''))
    setTimeout(() => nameRef.current?.focus(), 50)
  }, [addPlayerOpen, editPlayerId])

  if (!addPlayerOpen) return null

  const submit = async (keepOpen = false) => {
    if (!name.trim()) {
      await confirm({ title: 'Missing Name', message: 'Enter a player name.', confirmLabel: 'OK', hideCancel: true })
      return
    }
    const skillValue = parseInt(skill) || 0
    if (isEdit) {
      dispatch({ type: 'EDIT_PLAYER', id: editPlayerId!, name, skill: skillValue })
      closePlayerModal()
      return
    }
    dispatch({ type: 'ADD_PLAYER', name, skill: skillValue })
    if (keepOpen) {
      setName('')
      setSkill('')
      nameRef.current?.focus()
    } else {
      closePlayerModal()
    }
  }

  return (
    <div className="modal-overlay open" onClick={e => { if (e.target === e.currentTarget) closePlayerModal() }}>
      <div className="modal">
        <div className="modal-title">{isEdit ? 'EDIT PLAYER' : 'ADD PLAYER'}</div>
        <div className="form-row">
          <label>Player Name</label>
          <input
            ref={nameRef}
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Enter name"
            onKeyDown={e => { if (e.key === 'Enter') submit(false) }}
          />
        </div>
        <div className="form-row">
          <label>Skill</label>
          <select value={skill} onChange={e => setSkill(e.target.value)}>
            {SKILL_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        {!isEdit && (
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
            {tType === 'singles'
              ? 'Singles event — this player becomes their own team automatically.'
              : 'After adding players, pair them into doubles teams on the Teams page.'}
          </div>
        )}
        <div className="modal-actions">
          <button className="btn btn-outline" onClick={closePlayerModal}>Cancel</button>
          {!isEdit && (
            <button className="btn btn-outline" onClick={() => submit(true)}>Add Another</button>
          )}
          <button className="btn btn-primary" onClick={() => submit(false)}>{isEdit ? 'Save' : 'Add'}</button>
        </div>
      </div>
    </div>
  )
}
