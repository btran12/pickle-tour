import { useState } from 'react'
import { useTournament } from '../../context/TournamentContext'
import { SKILL_LABELS } from '../../types'
import type { Team } from '../../types'

export function GroupsPage() {
  const { state, dispatch } = useTournament()
  const { groups, teams, bMethod } = state
  const isManual = bMethod === 'manual'

  const [dragTeamId, setDragTeamId] = useState<number | null>(null)
  const [dragFromGroupId, setDragFromGroupId] = useState<number | null>(null)
  const [dragOverGroupId, setDragOverGroupId] = useState<number | null>(null)

  const handleDragStart = (teamId: number, fromGroupId: number) => {
    setDragTeamId(teamId)
    setDragFromGroupId(fromGroupId)
  }
  const handleDrop = (toGroupId: number | null) => {
    if (dragTeamId === null) return
    dispatch({ type: 'MOVE_TEAM', teamId: dragTeamId, fromGroupId: dragFromGroupId, toGroupId })
    setDragTeamId(null)
    setDragFromGroupId(null)
    setDragOverGroupId(null)
  }

  // Unassigned teams (manual mode)
  const assignedIds = new Set(groups.flatMap(g => g.teams.map(t => t.id)))
  const unassigned = isManual ? teams.filter(t => !assignedIds.has(t.id)) : []

  if (!groups.length) return (
    <div>
      <div className="section-title">Groups</div>
      <div className="section-sub">No groups yet</div>
      <div className="alert alert-warn">
        Go to Teams and click <strong>Go to Groups</strong> to assign teams.
      </div>
    </div>
  )

  const subtext = isManual
    ? 'Drag teams between groups to reassign'
    : `${teams.length} teams across ${groups.length} groups — ${bMethod} assignment`

  return (
    <div>
      <div className="section-title">Groups</div>
      <div className="section-sub">{subtext}</div>

      <div className="flex-row mb12 no-print" style={{ gap: 7, flexWrap: 'wrap' }}>
        <button className="btn btn-outline btn-sm" onClick={() => dispatch({ type: 'ASSIGN_GROUPS' })}>
          ↺ Reassign
        </button>
        {Object.keys(state.rrMatches).length === 0 && (
          <button className="btn btn-primary btn-sm" onClick={() => dispatch({ type: 'START_RR' })}>
            Start Round Robin →
          </button>
        )}
        {Object.keys(state.rrMatches).length > 0 && (
          <button className="btn btn-outline btn-sm" onClick={() => dispatch({ type: 'SET_PAGE', page: 'roundrobin' })}>
            View Round Robin →
          </button>
        )}
      </div>

      <div className="group-container">
        {groups.map(g => (
          <div
            key={g.id}
            className={`group-card ${dragOverGroupId === g.id ? 'drag-over' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragOverGroupId(g.id) }}
            onDragLeave={() => setDragOverGroupId(null)}
            onDrop={() => handleDrop(g.id)}
          >
            <div className="group-header">
              <div className="group-label">{g.name}</div>
              <div className="group-count">{g.teams.length} teams</div>
            </div>
            {g.teams.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', padding: '10px 0' }}>Drop here</div>
            ) : (
              g.teams.map(t => (
                <GroupTeamItem
                  key={t.id}
                  team={t}
                  groupId={g.id}
                  isDragging={dragTeamId === t.id}
                  draggable={isManual}
                  onDragStart={() => handleDragStart(t.id, g.id)}
                />
              ))
            )}
          </div>
        ))}
      </div>

      {isManual && (
        <div
          className={`unassigned-pool ${dragOverGroupId === null && dragTeamId !== null ? 'drag-over' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragOverGroupId(null) }}
          onDragLeave={() => {}}
          onDrop={() => handleDrop(null)}
        >
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
            Unassigned
          </div>
          {unassigned.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>All teams assigned</div>
          ) : (
            unassigned.map(t => (
              <GroupTeamItem
                key={t.id}
                team={t}
                groupId={null}
                isDragging={dragTeamId === t.id}
                draggable
                onDragStart={() => handleDragStart(t.id, null!)}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}

function GroupTeamItem({ team, isDragging, draggable, onDragStart }: {
  team: Team; groupId: number | null; isDragging: boolean; draggable: boolean; onDragStart: () => void
}) {
  const skillRound = Math.round(team.avgSkill)
  return (
    <div
      className={`group-team ${isDragging ? 'dragging' : ''}`}
      draggable={draggable}
      onDragStart={draggable ? onDragStart : undefined}
    >
      <span>{team.name}</span>
      {team.avgSkill > 0 && (
        <span className={`skill-badge skill-${skillRound}`}>{SKILL_LABELS[skillRound]}</span>
      )}
    </div>
  )
}
