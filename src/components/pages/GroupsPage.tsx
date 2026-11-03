import { useState } from 'react'
import { useTournament } from '../../context/TournamentContext'
import { useConfirm } from '../../context/ConfirmContext'
import { SKILL_LABELS, S_CONSTRAINTS } from '../../types'
import { getTeamDisplayName } from '../../utils/scoring'
import type { Team } from '../../types'

export function GroupsPage() {
  const { state, dispatch } = useTournament()
  const confirm = useConfirm()
  const { groups, teams, bMethod, settings, rrMatches, bracketRounds } = state
  const isManual = bMethod === 'manual'
  const groupLimit = S_CONSTRAINTS.numGroups
  const hasRR = Object.keys(rrMatches).length > 0
  const stageStarted = hasRR || bracketRounds.length > 0

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

  const moveTeam = (teamId: number, fromGroupId: number | null, toGroupId: number | null) => {
    if (fromGroupId === toGroupId) return
    dispatch({ type: 'MOVE_TEAM', teamId, fromGroupId, toGroupId })
  }

  const adjustGroupCount = (delta: number) => {
    dispatch({ type: 'SET_GROUP_COUNT', count: settings.numGroups + delta })
  }

  const groupCountControl = (
    <div className="group-settings-bar mb12">
      <div style={{ minWidth: 0 }}>
        <div className="setting-label">Number of Groups</div>
        <div className="setting-desc">
          {stageStarted
            ? 'Locked — round robin has already started'
            : 'Changing the count reshapes the groups. Use Reassign to redistribute teams.'}
        </div>
      </div>
      <div className="num-control" aria-label="Number of groups">
        <button
          type="button"
          aria-label="Fewer groups"
          disabled={stageStarted || settings.numGroups <= groupLimit.min}
          onClick={() => adjustGroupCount(-1)}
        >−</button>
        <span>{settings.numGroups}</span>
        <button
          type="button"
          aria-label="More groups"
          disabled={stageStarted || settings.numGroups >= groupLimit.max}
          onClick={() => adjustGroupCount(1)}
        >+</button>
      </div>
    </div>
  )

  // Unassigned teams are meaningful in every grouping mode — not only manual.
  const assignedIds = new Set(groups.flatMap(g => g.teams.map(t => t.id)))
  const unassigned = teams.filter(t => !assignedIds.has(t.id))

  const rrParticipantIds = new Set<number>()
  Object.values(rrMatches).flat().forEach(m => {
    if (m.teamA) rrParticipantIds.add(m.teamA.id)
    if (m.teamB) rrParticipantIds.add(m.teamB.id)
  })
  const rrOutOfSync = hasRR && (
    rrParticipantIds.size !== assignedIds.size ||
    [...assignedIds].some(id => !rrParticipantIds.has(id))
  )

  const addMissingToGroups = async () => {
    if (hasRR) {
      if (bracketRounds.length > 0) {
        dispatch({ type: 'SYNC_GROUPS' })
        return
      }
      const ok = await confirm({
        title: 'Add Teams & Rebuild Round Robin',
        message: `Add the ${unassigned.length} missing team${unassigned.length !== 1 ? 's' : ''} to groups and rebuild the round robin? Existing round-robin scores will be cleared.`,
        confirmLabel: 'Add & Rebuild',
        danger: true,
      })
      if (!ok) return
      dispatch({ type: 'SYNC_GROUPS' })
      dispatch({ type: 'START_RR' })
      return
    }
    dispatch({ type: 'SYNC_GROUPS' })
  }

  const rebuildRR = async () => {
    const ok = await confirm({
      title: 'Rebuild Round Robin',
      message: 'Rebuild all round-robin fixtures from the current groups? Existing round-robin scores will be cleared.',
      confirmLabel: 'Rebuild',
      danger: true,
    })
    if (ok) dispatch({ type: 'START_RR' })
  }

  if (!groups.length) return (
    <div>
      <div className="section-title">Groups</div>
      <div className="section-sub">No groups yet</div>
      {groupCountControl}
      <div className="alert alert-warn">
        {teams.length
          ? <>Create groups below, or go to Teams and click <strong>Go to Groups</strong> to assign teams.</>
          : <>Add players and teams first, then create groups here.</>}
      </div>
      {teams.length > 0 && (
        <button className="btn btn-primary" onClick={() => dispatch({ type: 'ASSIGN_GROUPS' })}>
          Create {settings.numGroups} {settings.numGroups === 1 ? 'Group' : 'Groups'} →
        </button>
      )}
    </div>
  )

  const subtext = isManual
    ? 'Drag teams between groups to reassign'
    : `${teams.length} teams across ${groups.length} groups — ${bMethod} assignment`

  return (
    <div>
      <div className="section-title">Groups</div>
      <div className="section-sub">{subtext}</div>

      {groupCountControl}

      {unassigned.length > 0 && (
        <div className="alert alert-warn mb12 groups-alert">
          <div style={{ minWidth: 0 }}>
            <strong>
              {unassigned.length} team{unassigned.length !== 1 ? 's' : ''} not in any group
            </strong>
            <div style={{ fontSize: 12, marginTop: 3 }}>
              {unassigned.slice(0, 5).map(t => getTeamDisplayName(t)).join(', ')}
              {unassigned.length > 5 ? ` +${unassigned.length - 5} more` : ''} — no round-robin matches will be created for {unassigned.length === 1 ? 'this team' : 'these teams'}.
            </div>
          </div>
          <button className="btn btn-sm btn-primary" onClick={addMissingToGroups}>
            {hasRR && bracketRounds.length === 0 ? 'Add & rebuild RR' : 'Add to groups'}
          </button>
        </div>
      )}

      {rrOutOfSync && unassigned.length === 0 && bracketRounds.length === 0 && (
        <div className="alert alert-warn mb12 groups-alert">
          <div style={{ minWidth: 0 }}>
            <strong>Round robin is out of date</strong>
            <div style={{ fontSize: 12, marginTop: 3 }}>
              The groups changed after fixtures were generated. Rebuild to match the current groups.
            </div>
          </div>
          <button className="btn btn-sm btn-primary" onClick={rebuildRR}>Rebuild RR</button>
        </div>
      )}

      <div className="flex-row mb12 no-print" style={{ gap: 7, flexWrap: 'wrap' }}>
        <button className="btn btn-outline btn-sm" onClick={() => dispatch({ type: 'ASSIGN_GROUPS' })}>
          ↺ Reassign
        </button>
        {!hasRR && (
          <button className="btn btn-primary btn-sm" onClick={() => dispatch({ type: 'START_RR' })}>
            Start Round Robin →
          </button>
        )}
        {hasRR && (
          <button className="btn btn-outline btn-sm" onClick={() => dispatch({ type: 'SET_PAGE', page: 'roundrobin' })}>
            View Round Robin →
          </button>
        )}
        {hasRR && bracketRounds.length === 0 && (
          <button className="btn btn-outline btn-sm" onClick={rebuildRR}>
            ↻ Rebuild RR
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
                  groups={isManual ? groups : undefined}
                  onMove={isManual ? to => moveTeam(t.id, g.id, to) : undefined}
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
                groups={groups}
                onMove={to => moveTeam(t.id, null, to)}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}

function GroupTeamItem({ team, groupId, isDragging, draggable, onDragStart, groups, onMove }: {
  team: Team
  groupId: number | null
  isDragging: boolean
  draggable: boolean
  onDragStart: () => void
  groups?: { id: number; name: string }[]
  onMove?: (toGroupId: number | null) => void
}) {
  const skillRound = Math.round(team.avgSkill)
  return (
    <div
      className={`group-team ${isDragging ? 'dragging' : ''}`}
      draggable={draggable}
      onDragStart={draggable ? onDragStart : undefined}
    >
      <span className="group-team-name">{getTeamDisplayName(team)}</span>
      <span className="group-team-end">
        {team.avgSkill > 0 && (
          <span className={`skill-badge skill-${skillRound}`}>{SKILL_LABELS[skillRound]}</span>
        )}
        {groups && onMove && (
          <select
            className="group-move-select"
            value={groupId ?? ''}
            aria-label={`Move ${getTeamDisplayName(team)} to group`}
            draggable={false}
            onMouseDown={e => e.stopPropagation()}
            onClick={e => e.stopPropagation()}
            onChange={e => onMove(e.target.value === '' ? null : Number(e.target.value))}
          >
            <option value="">Unassigned</option>
            {groups.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        )}
      </span>
    </div>
  )
}
