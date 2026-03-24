import type { Match, Team, MatchType } from '../../types'
import { matchScoreDisplay, fmtTime } from '../../utils/scoring'
import { useTournament } from '../../context/TournamentContext'
import { useModal } from '../../context/ModalContext'

interface MatchCardProps {
  match: Match
  matchType: MatchType
  bestOf: number
  is3rdPlace?: boolean
}

export function MatchCard({ match, matchType, bestOf, is3rdPlace }: MatchCardProps) {
  const { state } = useTournament()
  const { openScore } = useModal()
  const isDone = match.status === 'done'
  const sc = state.schedule[match.id]
  const court = sc ? state.courts.find(c => c.id === sc.courtId) : null
  const sd = matchScoreDisplay(match, bestOf, state.settings.winScore, state.settings.winBy2)
  const teamA = match.teamA as Team | null
  const teamB = match.teamB as Team | null
  const winner = match.winner as Team | null
  const cardStyle = is3rdPlace ? { borderColor: 'rgba(205,127,50,.4)' } : undefined

  return (
    <div className={`match-card ${match.status === 'live' ? 'active-match' : ''} ${isDone ? 'completed' : ''}`} style={cardStyle}>
      <div className="match-header">
        <div className="flex-row" style={{ gap: 5, flexWrap: 'wrap' }}>
          <span className="match-label">{is3rdPlace ? '🥉 3rd Place · ' : ''}Best of {bestOf}</span>
          {court && <span className="court-badge">{court.name}</span>}
          {sc?.time && <span className="time-badge">{fmtTime(sc.time)}</span>}
        </div>
        <div className="match-meta">
          {isDone && (
            <button className="btn btn-ghost btn-sm no-print" onClick={() => openScore({ type: matchType, matchId: match.id })}>✏</button>
          )}
          <span className={`match-status-badge status-${isDone ? 'done' : match.status === 'live' ? 'live' : 'pending'}`}>
            {isDone ? `W: ${winner?.name}` : match.status === 'live' ? 'Live' : 'Pending'}
          </span>
        </div>
      </div>

      <div className="teams-row">
        <div className={`team-slot ${isDone && winner?.id === teamA?.id ? 'winner' : ''}`}>
          <div className="team-slot-name">{teamA?.name ?? 'TBD'}</div>
          {sd && <div className={`team-slot-score ${sd.loserA ? 'loser-score' : ''}`}>{sd.scoreA}</div>}
        </div>
        <div className="vs-sep">VS</div>
        <div className={`team-slot ${isDone && winner?.id === teamB?.id ? 'winner' : ''}`}>
          <div className="team-slot-name">{teamB?.name ?? 'TBD'}</div>
          {sd && <div className={`team-slot-score ${sd.loserB ? 'loser-score' : ''}`}>{sd.scoreB}</div>}
        </div>
      </div>

      {sd && sd.pips.length > 0 && (
        <div style={{ marginTop: 6 }}>
          {sd.pips.map((pip, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>G{i + 1}</span>
              <span className={`game-pip ${pip.winA ? 'win' : pip.winB ? 'loss' : ''}`}>{pip.scoreA}</span>
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>—</span>
              <span className={`game-pip ${pip.winB ? 'win' : pip.winA ? 'loss' : ''}`}>{pip.scoreB}</span>
            </div>
          ))}
        </div>
      )}

      {!isDone && (
        <div className="mt8 no-print">
          <button className="btn btn-outline btn-sm" onClick={() => openScore({ type: matchType, matchId: match.id })}>
            {match.games.length ? '✏ Update' : '+ Enter Score'}
          </button>
        </div>
      )}
    </div>
  )
}
