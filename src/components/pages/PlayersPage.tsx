import { useState } from 'react'
import { useTournament } from '../../context/TournamentContext'
import { useModal } from '../../context/ModalContext'
import { SKILL_LABELS } from '../../types'

const TIER_LABEL: Record<number, string> = {
  5: '4.5+ — Elite', 4: '4.0 — Advanced', 3: '3.5 — Solid',
  2: '2.5–3.0 — Intermediate', 1: '2.0 — Beginner', 0: 'Skill Not Set',
}

export function PlayersPage() {
  const { state } = useTournament()
  const { openEditTeam } = useModal()
  const { teams, tType } = state
  const [query, setQuery] = useState('')
  const isD = tType === 'doubles'

  if (!teams.length) return (
    <div>
      <div className="section-title">Players</div>
      <div className="section-sub">No players registered yet</div>
      <div className="empty-state"><div className="ei">🧑</div><strong>No players yet</strong>Add teams on the Teams tab first</div>
    </div>
  )

  const all = teams.flatMap(t => t.players.map(p => ({ name: p.name ?? '', skill: p.skill ?? 0, teamName: t.name, teamId: t.id })))
  const lq = query.toLowerCase().trim()
  const filtered = lq ? all.filter(p => p.name.toLowerCase().includes(lq) || p.teamName.toLowerCase().includes(lq)) : all
  filtered.sort((a, b) => (b.skill || 0) - (a.skill || 0) || a.name.localeCompare(b.name))

  const subtext = `${all.length} player${all.length !== 1 ? 's' : ''} across ${teams.length} team${teams.length !== 1 ? 's' : ''}`

  return (
    <div>
      <div className="section-title">Players</div>
      <div className="section-sub">{subtext}</div>

      <div className="form-row mb12">
        <input
          type="text"
          placeholder="Search players or teams…"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
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
                  {group.map((p, i) => (
                    <tr key={`${p.teamId}-${p.name}`}>
                      <td><span className="rank-num">{i + 1}</span></td>
                      <td style={{ fontWeight: 500 }}>{p.name}</td>
                      {isD && <td style={{ fontSize: 12, color: 'var(--text3)' }}>{p.teamName}</td>}
                      <td style={{ textAlign: 'right' }} className="no-print">
                        <button className="btn btn-outline btn-sm" onClick={() => openEditTeam(p.teamId)} title="Edit team">✏️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        })
      )}
    </div>
  )
}
