import { useEffect } from 'react'
import { useTournament } from '../../context/TournamentContext'
import { MatchCard } from '../shared/MatchCard'
import { computeStandings, getTeamDisplayName } from '../../utils/scoring'

export function RoundRobinPage() {
  const { state, dispatch } = useTournament()
  const { rrMatches, groups, curRRGroup, settings } = state

  const hasRR = Object.keys(rrMatches).length > 0
  const hasBracket = state.bracketMatches.length > 0

  const groupStatuses = groups.map((g, gi) => {
    const ms = rrMatches[gi] ?? []
    const total = ms.length
    const done = ms.filter(m => m.status === 'done').length
    const live = ms.filter(m => m.status === 'live').length
    return { group: g, gi, total, done, live, complete: total > 0 && done === total, empty: total === 0 }
  })
  const allGroupsDone = groupStatuses.length > 0 && groupStatuses.every(s => s.complete || s.empty)
  const remainingMatches = groupStatuses.reduce((n, s) => n + Math.max(0, s.total - s.done), 0)

  // Auto-create the bracket as soon as the last group match is recorded,
  // including when that score arrived from another device.
  useEffect(() => {
    if (hasRR && allGroupsDone) dispatch({ type: 'AUTO_GENERATE_BRACKET' })
  }, [hasRR, allGroupsDone, dispatch])

  if (!hasRR) return (
    <div>
      <div className="section-title">Round Robin</div>
      <div className="empty-state">
        <div className="ei">🔄</div>
        <strong>Round Robin not started</strong>
        Go to Groups and click Start Round Robin
      </div>
    </div>
  )

  const group = groups[curRRGroup]
  const matches = rrMatches[curRRGroup] ?? []
  const standings = group ? computeStandings(curRRGroup, state) : []
  const groupDone = matches.length > 0 && matches.every(m => m.status === 'done')

  return (
    <div>
      <div className="section-title">Round Robin</div>

      {/* Per-group status overview — spot finished groups at a glance */}
      <div className="card mb12">
        <div className="flex-row flex-between mb8" style={{ gap: 8, flexWrap: 'wrap' }}>
          <span className="card-title" style={{ marginBottom: 0 }}>Group Status</span>
          <span className="group-count">
            {allGroupsDone
              ? 'All matches played'
              : `${remainingMatches} match${remainingMatches === 1 ? '' : 'es'} remaining`}
          </span>
        </div>
        <div className="rr-status-grid">
          {groupStatuses.map(s => {
            const pct = s.total > 0 ? Math.round((s.done / s.total) * 100) : 0
            const status = s.empty
              ? { cls: 'status-pending', label: 'No matches' }
              : s.complete
                ? { cls: 'status-done', label: '✓ Complete' }
                : s.live > 0
                  ? { cls: 'status-live', label: `Live · ${s.done}/${s.total}` }
                  : { cls: 'status-pending', label: `${s.done}/${s.total} played` }
            return (
              <button
                key={s.group.id}
                className={`rr-status-card ${s.gi === curRRGroup ? 'active' : ''} ${s.complete ? 'complete' : ''}`}
                onClick={() => dispatch({ type: 'SET_RR_GROUP', gi: s.gi })}
              >
                <div className="rr-status-head">
                  <span className="rr-status-name">{s.group.name}</span>
                  <span className={`match-status-badge ${status.cls}`}>{status.label}</span>
                </div>
                <div className="rr-progress">
                  <div
                    className={`rr-progress-fill ${s.complete ? 'done' : ''}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="rr-status-meta">
                  {s.group.teams.length} teams · {s.done}/{s.total} matches
                  {s.live > 0 && <span className="rr-live-count"> · {s.live} live</span>}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex-row mb12 no-print" style={{ gap: 5, flexWrap: 'wrap' }}>
        {groupStatuses.map(s => (
          <button
            key={s.group.id}
            className={`btn btn-sm ${s.gi === curRRGroup ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => dispatch({ type: 'SET_RR_GROUP', gi: s.gi })}
          >
            {s.group.name}{s.complete ? ' ✓' : ''}
          </button>
        ))}
      </div>

      {/* Standings */}
      {group && (
        <div className="card mb12">
          <div className="card-title">Standings — {group.name}</div>
          <div className="table-scroll">
            <table className="standings-table">
              <thead>
                <tr><th>#</th><th>Team</th><th>W</th><th>L</th><th>GW</th><th>GL</th><th>PD</th></tr>
              </thead>
              <tbody>
                {standings.map((s, i) => (
                  <tr key={s.team.id}>
                    <td><span className={`rank-num rank-${i + 1}`}>{i + 1}</span></td>
                    <td style={{ fontWeight: 500 }}>
                      {getTeamDisplayName(s.team)}
                      {i < settings.advanceCount && <span style={{ fontSize: 10, color: 'var(--accent)', marginLeft: 4 }}>↑</span>}
                    </td>
                    <td style={{ color: 'var(--accent)' }}>{s.wins}</td>
                    <td style={{ color: 'var(--red)' }}>{s.losses}</td>
                    <td style={{ color: 'var(--text2)' }}>{s.gamesWon}</td>
                    <td style={{ color: 'var(--text3)' }}>{s.gamesLost}</td>
                    <td className="pts-cell">{s.pd >= 0 ? '+' : ''}{s.pd}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {allGroupsDone ? (
        <div className="alert alert-success groups-alert">
          <span>
            ✅ All groups complete{hasBracket ? ' — bracket ready!' : '.'}
            <span style={{ fontSize: 12, color: 'var(--text3)', marginLeft: 6 }}>
              {hasBracket ? 'Updated automatically from group standings.' : 'Generating bracket…'}
            </span>
          </span>
          <button
            className="btn btn-sm btn-primary no-print"
            onClick={() => hasBracket
              ? dispatch({ type: 'SET_PAGE', page: 'bracket' })
              : dispatch({ type: 'GENERATE_BRACKET' })}
          >
            {hasBracket ? 'View Bracket →' : 'Generate Bracket →'}
          </button>
        </div>
      ) : groupDone ? (
        <div className="alert alert-info groups-alert">
          <span>✅ {group?.name} complete — {remainingMatches} match{remainingMatches === 1 ? '' : 'es'} left in other groups.</span>
          <span style={{ fontSize: 12, color: 'var(--text3)' }}>
            Bracket is generated automatically once every group finishes.
          </span>
        </div>
      ) : null}

      <div className="card-title mb8">Matches{group ? ` — ${group.name}` : ''}</div>
      {matches.map(m => (
        <MatchCard key={m.id} match={m} matchType="rr" bestOf={settings.groupStageBestOf} testingMode={state.testingMode} />
      ))}
    </div>
  )
}
