import { useState } from 'react'
import { useTournament } from '../../context/TournamentContext'
import { useModal } from '../../context/ModalContext'
import { useConfirm } from '../../context/ConfirmContext'
import { SKILL_LABELS } from '../../types'
import type { RosterPlayer } from '../../types'

const TIER_LABEL: Record<number, string> = {
  5: '4.5+ — Elite', 4: '4.0 — Advanced', 3: '3.5 — Solid',
  2: '2.5–3.0 — Intermediate', 1: '2.0 — Beginner', 0: 'Not Rated',
}

export function PlayersPage() {
  const { state, dispatch } = useTournament()
  const { openAddPlayer, openEditPlayer } = useModal()
  const confirm = useConfirm()
  const { teams, players, tType } = state
  const [query, setQuery] = useState('')
  const isD = tType === 'doubles'

  const teamFor = (player: RosterPlayer) =>
    teams.find(t => t.players.some(p => p.playerId === player.id)) ??
    teams.find(t => t.players.some(p => p.name === player.name && p.skill === player.skill))

  if (!players.length) return (
    <div>
      <div className="section-title">Players</div>
      <div className="section-sub">No players registered yet</div>
      <div className="empty-state">
        <div className="ei">🧑</div>
        <strong>No players yet</strong>
        Add players individually, then assign them to teams
        <div className="mt12">
          <button className="btn btn-primary" onClick={openAddPlayer}>+ Add Player</button>
        </div>
      </div>
    </div>
  )

  const lq = query.toLowerCase().trim()
  const filtered = players
    .filter(p => {
      if (!lq) return true
      const team = teamFor(p)
      return p.name.toLowerCase().includes(lq) || (team?.name ?? '').toLowerCase().includes(lq)
    })
    .sort((a, b) => (b.skill || 0) - (a.skill || 0) || a.name.localeCompare(b.name))

  const assigned = players.filter(p => teamFor(p)).length
  const subtext = isD
    ? `${players.length} player${players.length !== 1 ? 's' : ''} · ${assigned} assigned · ${players.length - assigned} unassigned`
    : `${players.length} player${players.length !== 1 ? 's' : ''} — one team each`

  return (
    <div>
      <div className="section-title">Players</div>
      <div className="section-sub">{subtext}</div>

      <div className="flex-row flex-between mb12" style={{ flexWrap: 'wrap', gap: 8 }}>
        <div className="form-row" style={{ flex: 1, minWidth: 220, marginBottom: 0 }}>
          <input
            type="text"
            placeholder="Search players or teams…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
        <div className="flex-row" style={{ gap: 7 }}>
          <button className="btn btn-primary btn-sm" onClick={openAddPlayer}>+ Add Player</button>
          {isD && players.length >= 2 && (
            <button className="btn btn-outline btn-sm" onClick={() => dispatch({ type: 'SET_PAGE', page: 'teams' })}>
              Assign Teams →
            </button>
          )}
        </div>
      </div>

      {!filtered.length ? (
        <div className="empty-state"><div className="ei">🔍</div><strong>No players match</strong>Try a different search</div>
      ) : (
        [5, 4, 3, 2, 1, 0].map(sk => {
          const group = filtered.filter(p => (p.skill || 0) === sk)
          if (!group.length) return null
          return (
            <div key={sk} className="card mb12">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                {sk ? (
                  <span className={`skill-badge skill-${sk}`}>{TIER_LABEL[sk]}</span>
                ) : (
                  <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Skill Not Set</span>
                )}
                <span style={{ fontSize: 12, color: 'var(--text3)' }}>{group.length} player{group.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="table-scroll">
                <table className="standings-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Player</th>
                      {isD && <th>Team</th>}
                      <th className="no-print" style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.map((p, i) => {
                      const team = teamFor(p)
                      return (
                        <tr key={p.id}>
                          <td><span className="rank-num">{i + 1}</span></td>
                          <td style={{ fontWeight: 500 }}>{p.name}</td>
                          {isD && (
                            <td style={{ fontSize: 12, color: team ? 'var(--text3)' : 'var(--text3)' }}>
                              {team ? team.name : <em>Unassigned</em>}
                            </td>
                          )}
                          <td style={{ textAlign: 'right' }} className="no-print">
                            <div style={{ display: 'flex', gap: 5, justifyContent: 'flex-end' }}>
                              <button className="btn btn-outline btn-sm" onClick={() => openEditPlayer(p.id)} title="Edit player">✏️</button>
                              <button
                                className="btn btn-danger btn-sm"
                                title="Remove player"
                                onClick={async () => {
                                  if (await confirm({
                                    title: 'Remove Player',
                                    message: `Remove ${p.name} from the tournament?`,
                                    confirmLabel: 'Remove',
                                    danger: true,
                                  })) {
                                    dispatch({ type: 'REMOVE_PLAYER', id: p.id })
                                  }
                                }}
                              >✕</button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
