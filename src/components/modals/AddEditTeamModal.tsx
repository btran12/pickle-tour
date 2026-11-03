import { useState, useEffect } from 'react'
import { useTournament } from '../../context/TournamentContext'
import { useModal } from '../../context/ModalContext'
import { useConfirm } from '../../context/ConfirmContext'
import type { Team } from '../../types'

export function AddEditTeamModal() {
  const { state, dispatch } = useTournament()
  const { addTeamOpen, editTeamId, closeTeamModal } = useModal()
  const confirm = useConfirm()
  const { teams, players } = state
  const isEdit = editTeamId !== null
  const existing = isEdit ? teams.find(t => t.id === editTeamId) : null

  const [tn, setTn] = useState('')
  const [p1, setP1] = useState('')
  const [p2, setP2] = useState('')

  // Players already on another team can't be picked again.
  const assignedElsewhere = new Set(
    teams
      .filter(t => t.id !== editTeamId)
      .flatMap(t => t.players.map(p => p.playerId))
      .filter((id): id is number => id != null)
  )
  const selectable = players.filter(p => !assignedElsewhere.has(p.id))

  useEffect(() => {
    if (!addTeamOpen) return
    setTn(existing?.name ?? '')
    setP1(String(existing?.players[0]?.playerId ?? ''))
    setP2(String(existing?.players[1]?.playerId ?? ''))
  }, [addTeamOpen, editTeamId])

  if (!addTeamOpen) return null

  const handleSubmit = async () => {
    const chosen = [p1, p2]
      .filter(Boolean)
      .map(id => players.find(p => p.id === Number(id)))
      .filter((p): p is NonNullable<typeof p> => Boolean(p))

    if (chosen.length !== 2) {
      await confirm({
        title: 'Choose Players',
        message: 'Choose two players for a doubles team.',
        confirmLabel: 'OK',
        hideCancel: true,
      })
      return
    }

    const teamPlayers = chosen.map(p => ({ playerId: p.id, name: p.name, skill: p.skill }))
    const skills = teamPlayers.map(p => p.skill).filter(s => s > 0)
    const avgSkill = skills.length ? skills.reduce((a, b) => a + b, 0) / skills.length : 0

    if (isEdit) {
      const team: Team = {
        id: editTeamId!,
        name: tn.trim() || chosen.map(p => p.name).join(' / '),
        players: teamPlayers,
        avgSkill,
      }
      dispatch({ type: 'EDIT_TEAM', team })
    } else {
      dispatch({ type: 'CREATE_TEAM', playerIds: chosen.map(p => p.id), name: tn })
    }
    closeTeamModal()
  }

  return (
    <div className="modal-overlay open" onClick={e => { if (e.target === e.currentTarget) closeTeamModal() }}>
      <div className="modal">
        <div className="modal-title">{isEdit ? 'EDIT DOUBLES TEAM' : 'ADD DOUBLES TEAM'}</div>

        {players.length === 0 ? (
          <>
            <div className="alert alert-warn">
              Add players first, then you can pair them into teams.
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={closeTeamModal}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={() => { closeTeamModal(); dispatch({ type: 'SET_PAGE', page: 'players' }) }}
              >
                Go to Players →
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="form-row">
              <label>Team Name (optional)</label>
              <input
                type="text"
                value={tn}
                onChange={e => setTn(e.target.value)}
                placeholder="Auto-generated from player names"
              />
            </div>
            <div className="form-row-inline">
              <div>
                <label>Player 1</label>
                <select value={p1} onChange={e => setP1(e.target.value)}>
                  <option value="">Select player…</option>
                  {selectable.filter(p => String(p.id) !== p2).map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label>Player 2</label>
                <select value={p2} onChange={e => setP2(e.target.value)}>
                  <option value="">Select player…</option>
                  {selectable.filter(p => String(p.id) !== p1).map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>
            {selectable.length < 2 && (
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 8 }}>
                Not enough unassigned players. Add more players or remove a team first.
              </div>
            )}
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={closeTeamModal}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={selectable.length < 2}>
                {isEdit ? 'Save' : 'Add Team'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
