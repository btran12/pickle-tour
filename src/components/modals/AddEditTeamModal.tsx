import { useState, useEffect, useRef } from 'react'
import { useTournament } from '../../context/TournamentContext'
import { useModal } from '../../context/ModalContext'
import type { Team } from '../../types'

const SKILL_OPTS = [
  { value: '', label: 'Not specified' },
  { value: '1', label: '2.0 — Beginner' },
  { value: '2', label: '2.5–3.0 — Intermediate' },
  { value: '3', label: '3.5 — Solid' },
  { value: '4', label: '4.0 — Advanced' },
  { value: '5', label: '4.5+ — Elite' },
]

export function AddEditTeamModal() {
  const { state, dispatch } = useTournament()
  const { addTeamOpen, editTeamId, closeTeamModal } = useModal()
  const { tType, teams, _tid } = state
  const isEdit = editTeamId !== null
  const isD = tType === 'doubles'
  const p1Ref = useRef<HTMLInputElement>(null)

  const existing = isEdit ? teams.find(t => t.id === editTeamId) : null

  const [tn, setTn] = useState('')
  const [p1, setP1] = useState('')
  const [s1, setS1] = useState('')
  const [p2, setP2] = useState('')
  const [s2, setS2] = useState('')

  useEffect(() => {
    if (!addTeamOpen) return
    if (existing) {
      const ep1 = existing.players[0] ?? {}
      const ep2 = existing.players[1] ?? {}
      setTn(isD ? existing.name : '')
      setP1((ep1 as { name?: string }).name ?? '')
      setS1(String((ep1 as { skill?: number }).skill ?? ''))
      setP2((ep2 as { name?: string }).name ?? '')
      setS2(String((ep2 as { skill?: number }).skill ?? ''))
    } else {
      setTn(''); setP1(''); setS1(''); setP2(''); setS2('')
    }
    setTimeout(() => p1Ref.current?.focus(), 50)
  }, [addTeamOpen, editTeamId])

  if (!addTeamOpen) return null

  const handleSubmit = () => {
    if (!p1.trim()) { alert('Enter player name.'); return }
    const sk1 = parseInt(s1) || 0
    let team: Team
    if (!isD) {
      team = { id: isEdit ? editTeamId! : _tid, name: p1.trim(), players: [{ name: p1.trim(), skill: sk1 }], avgSkill: sk1 }
    } else {
      const p2v = p2.trim() || 'Player 2'
      const sk2 = parseInt(s2) || 0
      const name = isD ? (tn.trim() || `${p1.trim()} / ${p2v}`) : p1.trim()
      const skills = [sk1, sk2].filter(s => s > 0)
      const avg = skills.length ? skills.reduce((a, b) => a + b, 0) / skills.length : 0
      team = { id: isEdit ? editTeamId! : _tid, name, players: [{ name: p1.trim(), skill: sk1 }, { name: p2v, skill: sk2 }], avgSkill: avg }
    }
    dispatch(isEdit ? { type: 'EDIT_TEAM', team } : { type: 'ADD_TEAM', team })
    closeTeamModal()
  }

  const title = isEdit ? (isD ? 'EDIT DOUBLES TEAM' : 'EDIT PLAYER') : (isD ? 'ADD DOUBLES TEAM' : 'ADD PLAYER')

  return (
    <div className="modal-overlay open" onClick={e => { if (e.target === e.currentTarget) closeTeamModal() }}>
      <div className="modal">
        <div className="modal-title">{title}</div>
        {isD && (
          <div className="form-row">
            <label>Team Name (optional)</label>
            <input type="text" value={tn} onChange={e => setTn(e.target.value)} placeholder="Auto-generated if blank" />
          </div>
        )}
        <div className={isD ? 'form-row-inline' : 'form-row'}>
          <div>
            <label>{isD ? 'Player 1' : 'Player Name'}</label>
            <input ref={p1Ref} type="text" value={p1} onChange={e => setP1(e.target.value)} placeholder={isD ? 'Player 1' : 'Enter name'} />
          </div>
          <div>
            <label>Skill</label>
            <select value={s1} onChange={e => setS1(e.target.value)}>
              {SKILL_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
        {isD && (
          <div className="form-row-inline mt8">
            <div>
              <label>Player 2</label>
              <input type="text" value={p2} onChange={e => setP2(e.target.value)} placeholder="Player 2" />
            </div>
            <div>
              <label>Skill</label>
              <select value={s2} onChange={e => setS2(e.target.value)}>
                {SKILL_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
        )}
        <div className="modal-actions">
          <button className="btn btn-outline" onClick={closeTeamModal}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit}>{isEdit ? 'Save' : 'Add'}</button>
        </div>
      </div>
    </div>
  )
}
