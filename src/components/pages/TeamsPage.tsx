import { useState } from 'react'
import { useTournament } from '../../context/TournamentContext'
import { useModal } from '../../context/ModalContext'
import { useConfirm } from '../../context/ConfirmContext'
import { SKILL_LABELS } from '../../types'

export function TeamsPage() {
  const { state, dispatch } = useTournament()
  const { openAddTeam, openEditTeam, openAddPlayer, openEditPlayer } = useModal()
  const confirm = useConfirm()
  const { teams, players, tType } = state
  const isD = tType === 'doubles'
  const [selected, setSelected] = useState<number[]>([])

  const assignedIds = new Set(
    teams
      .flatMap(t => t.players.map(p => p.playerId))
      .filter((id): id is number => id != null)
  )
  const unassigned = players.filter(p => !assignedIds.has(p.id))

  const toggle = (id: number) => {
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id)
      if (prev.length >= 2) return [prev[1], id]
      return [...prev, id]
    })
  }

  const createSelectedTeam = () => {
    if (selected.length !== 2) return
    dispatch({ type: 'CREATE_TEAM', playerIds: selected })
    setSelected([])
  }

  const randomize = async () => {
    if (!players.length) {
      await confirm({ title: 'No Players', message: 'Add players first.', confirmLabel: 'OK', hideCancel: true })
      return
    }
    const odd = isD && players.length % 2 !== 0
    const msg = teams.length
      ? `This will clear the current ${teams.length} team${teams.length !== 1 ? 's' : ''} and re-pair all ${players.length} players randomly.`
      : `Randomly pair ${players.length} players into teams?`
    if (await confirm({
      title: 'Randomize Teams',
      message: msg + (odd ? '\n\nOne player will be left unassigned.' : ''),
      confirmLabel: 'Randomize',
    })) {
      dispatch({ type: 'RANDOMIZE_TEAMS' })
      setSelected([])
    }
  }

  const loadSamples = async (count: 8 | 16 | 32) => {
    if (players.length || teams.length) {
      const ok = await confirm({
        title: 'Load Sample Teams',
        message: `This will add ${count} sample doubles teams (and their players). Continue?`,
        confirmLabel: 'Add Samples',
      })
      if (!ok) return
    }
    const action = count === 8 ? 'LOAD_SAMPLE_TEAMS' : count === 16 ? 'LOAD_SAMPLE_TEAMS_16' : 'LOAD_SAMPLE_TEAMS_32'
    dispatch({ type: action })
  }

  return (
    <div>
      <div className="section-title">Teams</div>
      <div className="section-sub">
        {isD
          ? `${teams.length} team${teams.length !== 1 ? 's' : ''} · ${players.length} registered player${players.length !== 1 ? 's' : ''}`
          : `${players.length} player${players.length !== 1 ? 's' : ''} · one team each`}
      </div>

      <div className="flex-row flex-between mb12 no-print" style={{ flexWrap: 'wrap', gap: 7 }}>
        <div className="flex-row" style={{ gap: 7, flexWrap: 'wrap' }}>
          <button className="btn btn-primary btn-sm" onClick={openAddPlayer}>+ Add Player</button>
          {isD && (
            <>
              <button className="btn btn-outline btn-sm" onClick={openAddTeam}>+ Add Team</button>
              <button className="btn btn-outline btn-sm" onClick={randomize}>🎲 Randomize</button>
              {teams.length > 0 && (
                <button className="btn btn-outline btn-sm" onClick={async () => {
                  const ok = await confirm({
                    title: 'Clear Teams',
                    message: 'Remove all teams? Players will stay registered and become unassigned.',
                    confirmLabel: 'Clear Teams',
                    danger: true,
                  })
                  if (ok) {
                    dispatch({ type: 'CLEAR_TEAMS' })
                    setSelected([])
                  }
                }}>Clear Teams</button>
              )}
            </>
          )}
        </div>
        {teams.length >= 2 && (
          <button className="btn btn-outline btn-sm" onClick={() => {
            dispatch({ type: 'ASSIGN_GROUPS' })
            dispatch({ type: 'SET_PAGE', page: 'groups' })
          }}>Go to Groups →</button>
        )}
      </div>

      {!isD && (
        <div className="alert alert-info mb12" style={{ display: players.length ? 'none' : undefined }}>
          Add players to build the singles field. Each player is automatically their own team.
        </div>
      )}

      {isD && (
        <div className="card">
          <div className="card-title">Players</div>

          {!players.length ? (
            <div className="empty-state" style={{ padding: '24px 10px' }}>
              <div className="ei">🧑</div>
              <strong>No players yet</strong>
              Add players individually, then pair them into teams
            </div>
          ) : (
            <>
              <div className="flex-row flex-between mb12" style={{ flexWrap: 'wrap', gap: 8 }}>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                  {unassigned.length
                    ? `${unassigned.length} unassigned — select two to create a team`
                    : 'All players are assigned to teams'}
                </div>
                {unassigned.length > 0 && (
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={selected.length !== 2}
                    onClick={createSelectedTeam}
                  >
                    {selected.length === 2 ? 'Create Team →' : `Select 2 players (${selected.length}/2)`}
                  </button>
                )}
              </div>

              {unassigned.length > 0 && (
                <div className="player-pool">
                  {unassigned.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      className={`player-chip ${selected.includes(p.id) ? 'selected' : ''}`}
                      onClick={() => toggle(p.id)}
                    >
                      <span>{p.name}</span>
                      {p.skill > 0 && (
                        <span className={`skill-badge skill-${p.skill}`}>{SKILL_LABELS[p.skill]}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      <div id="teamsList">
        {teams.length === 0 ? (
          <div className="empty-state">
            <div className="ei">🎾</div>
            <strong>No teams yet</strong>
            {isD
              ? 'Add players, then create teams individually or randomize them'
              : 'Click Add Player to register your first player'}
          </div>
        ) : (
          teams.map(t => {
            const skillRound = Math.round(t.avgSkill)
            const player = t.players[0]?.playerId
              ? players.find(p => p.id === t.players[0].playerId)
              : players.find(p => p.name === t.players[0]?.name)
            return (
              <div key={t.id} className="team-item">
                <div>
                  <div className="team-name">
                    {t.name}
                    {t.avgSkill > 0 && (
                      <span className={`skill-badge skill-${skillRound}`}>{SKILL_LABELS[skillRound] ?? '?'}</span>
                    )}
                  </div>
                  {isD && t.players.length > 0 && (
                    <div className="team-meta team-player-list">
                      {t.players.map((p, i) => (
                        <span key={p.playerId ?? `${p.name}-${i}`} className="team-player">
                          {p.name}{p.skill ? ` (${SKILL_LABELS[p.skill]})` : ''}
                          {p.playerId != null && (
                            <button
                              type="button"
                              className="team-player-x no-print"
                              title="Remove from team"
                              onClick={() => dispatch({ type: 'UNASSIGN_PLAYER', teamId: t.id, playerId: p.playerId! })}
                            >×</button>
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 5 }}>
                  <button
                    className="btn btn-outline btn-sm no-print"
                    onClick={() => isD ? openEditTeam(t.id) : player && openEditPlayer(player.id)}
                    title={isD ? 'Edit team' : 'Edit player'}
                  >
                    ✏️
                  </button>
                  <button
                    className="btn btn-danger btn-sm no-print"
                    title={isD ? 'Remove team' : 'Remove player'}
                    onClick={async () => {
                      if (isD) {
                        dispatch({ type: 'REMOVE_TEAM', id: t.id })
                      } else if (player) {
                        if (await confirm({
                          title: 'Remove Player',
                          message: `Remove ${player.name}?`,
                          confirmLabel: 'Remove',
                          danger: true,
                        })) {
                          dispatch({ type: 'REMOVE_PLAYER', id: player.id })
                        }
                      }
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="mt12 no-print" style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: 'var(--text3)', alignSelf: 'center' }}>Sample data:</span>
        {([8, 16, 32] as const).map(n => (
          <button key={n} className="btn btn-ghost btn-sm" onClick={() => loadSamples(n)}>Sample {n}</button>
        ))}
      </div>
    </div>
  )
}
