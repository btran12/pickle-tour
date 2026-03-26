import { useTournament } from '../../context/TournamentContext'
import { MatchCard } from '../shared/MatchCard'
import { computeStandings, getTeamDisplayName } from '../../utils/scoring'

export function RoundRobinPage() {
  const { state, dispatch } = useTournament()
  const { rrMatches, groups, curRRGroup, settings } = state

  const hasRR = Object.keys(rrMatches).length > 0

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
  const allDone = matches.length > 0 && matches.every(m => m.status === 'done')
  const allGroupsDone = groups.every((_, gi) => {
    const ms = rrMatches[gi] ?? []
    return ms.length > 0 && ms.every(m => m.status === 'done')
  })

  return (
    <div>
      <div className="section-title">Round Robin</div>

      <div className="flex-row mb12 no-print" style={{ gap: 5, flexWrap: 'wrap' }}>
        {groups.map((g, i) => (
          <button
            key={g.id}
            className={`btn btn-sm ${i === curRRGroup ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => dispatch({ type: 'SET_RR_GROUP', gi: i })}
          >
            {g.name}
          </button>
        ))}
      </div>

      {/* Standings */}
      {group && (
        <div className="card mb12">
          <div className="card-title">Standings — {group.name}</div>
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
      )}

      {(allDone || allGroupsDone) && (
        <div className="alert alert-success">
          {allGroupsDone ? '✅ All groups complete!' : `✅ ${group?.name} complete!`}
          <button
            className="btn btn-sm btn-primary no-print"
            style={{ marginLeft: 9 }}
            onClick={() => dispatch({ type: 'GENERATE_BRACKET' })}
          >
            Generate Bracket →
          </button>
        </div>
      )}

      <div className="card-title mb8">Matches</div>
      {matches.map(m => (
        <MatchCard key={m.id} match={m} matchType="rr" bestOf={settings.groupStageBestOf} testingMode={state.testingMode} />
      ))}
    </div>
  )
}
