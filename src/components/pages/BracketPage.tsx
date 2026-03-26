import { useEffect } from 'react'
import { useTournament } from '../../context/TournamentContext'
import { useModal } from '../../context/ModalContext'
import { MatchCard } from '../shared/MatchCard'
import { matchScoreDisplay } from '../../utils/scoring'
import type { Team } from '../../types'

export function BracketPage() {
  const { state, dispatch } = useTournament()
  const { openScore } = useModal()
  const { bracketRounds, bracketMatches, thirdPlaceMatch, bracketSeedGroups, groups, settings, confettiShown } = state

  const fin = bracketRounds[bracketRounds.length - 1]?.matches[0]
  const champ = fin?.status === 'done' ? (fin.winner as Team | null) : null
  const tp = thirdPlaceMatch
  const third = tp?.status === 'done' ? (tp.winner as Team | null) : null
  const tournamentDone = !!champ && (!tp || tp.status === 'done')

  // Auto-trigger confetti
  useEffect(() => {
    if (tournamentDone && !confettiShown) {
      dispatch({ type: 'SET_CONFETTI_SHOWN' })
    }
  }, [tournamentDone, confettiShown, dispatch])

  if (!bracketRounds.length) return (
    <div>
      <div className="section-title">Bracket</div>
      <div className="empty-state">
        <div className="ei">🏆</div>
        <strong>Bracket not generated yet</strong>
        Complete round robin first
      </div>
    </div>
  )

  const groupBadge = (team: Team | null | undefined) => {
    if (!team || team.isBye) return null
    const gi = bracketSeedGroups[team.id]
    if (gi === undefined) return null
    const g = groups[gi]
    if (!g) return null
    return <span className="bracket-group-badge">{g.name}</span>
  }

  const getScore = (match: typeof bracketMatches[0], side: 'A' | 'B'): string => {
    const sd = matchScoreDisplay(match, match.bestOf ?? settings.sfBestOf, settings.winScore, settings.winBy2)
    if (!sd) return ''
    return String(side === 'A' ? sd.scoreA : sd.scoreB)
  }

  return (
    <div>
      <div className="section-title">Bracket</div>

      {champ && (
        <div className="alert alert-success" style={{ fontSize: 15, marginBottom: 18 }}>
          🏆 <strong>Champion: {champ.name}</strong>
          {third && ` · 🥉 3rd: ${third.name}`}
          {tournamentDone && (
            <button
              className="btn btn-sm btn-primary no-print"
              style={{ marginLeft: 12 }}
              onClick={() => dispatch({ type: 'SET_CONFETTI_SHOWN' })}
            >
              🎉 Celebrate!
            </button>
          )}
        </div>
      )}

      {/* Visual bracket */}
      <div className="bracket-wrapper">
        <div className="bracket">
          {bracketRounds.map((round, ri) => {
            const nextCount = bracketRounds[ri + 1]?.matches.length ?? 0
            return (
              <>
                <div key={round.title} className="bracket-round-col">
                  <div className="bracket-round-title">{round.title}</div>
                  <div className="bracket-round-body">
                    {round.matches.map(m => {
                      const isDone = m.status === 'done'
                      const tA = m.teamA as Team | null
                      const tB = m.teamB as Team | null
                      const winner = m.winner as Team | null
                      const isWinA = isDone && winner?.id === tA?.id
                      const isWinB = isDone && winner?.id === tB?.id
                      const hasScore = m.games.length > 0
                      const canScore = !isDone && tA && tB && !tA.isBye && !tB.isBye
                      return (
                        <div key={m.id} className="bracket-match">
                          <div className={`bracket-match-inner ${isDone ? 'winner-decided' : ''}`}>
                            <div className={`bracket-slot ${isWinA ? 'winner-slot' : ''}`}>
                              {tA?.isBye ? <span style={{ color: 'var(--text3)', fontStyle: 'italic' }}>BYE</span>
                                : tA ? <>{tA.name}{groupBadge(tA)}</> : <span style={{ color: 'var(--text3)' }}>TBD</span>}
                              {hasScore && <span className="bracket-slot-score">{getScore(m, 'A')}</span>}
                            </div>
                            <div className={`bracket-slot ${isWinB ? 'winner-slot' : ''}`}>
                              {tB?.isBye ? <span style={{ color: 'var(--text3)', fontStyle: 'italic' }}>BYE</span>
                                : tB ? <>{tB.name}{groupBadge(tB)}</> : <span style={{ color: 'var(--text3)' }}>TBD</span>}
                              {hasScore && <span className="bracket-slot-score">{getScore(m, 'B')}</span>}
                            </div>
                            {canScore && (
                              <div className="bracket-match-action no-print">
                                <button className="btn btn-outline btn-sm" onClick={() => openScore({ type: 'bracket', matchId: m.id })}>Score</button>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {ri < bracketRounds.length - 1 && (
                  <div key={`conn-${ri}`} className="bracket-connector-col">
                    <div className="bracket-connector-header" />
                    <div className="bracket-connector-body">
                      {Array.from({ length: nextCount }, (_, ci) => (
                        <div key={ci} className="bc-group">
                          <div className="bc-top-half" />
                          <div className="bc-bottom-half" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )
          })}

          {/* 3rd place */}
          {tp && (
            <>
              <div className="bracket-3p-sep" />
              <div className="bracket-round-col">
                <div className="bracket-round-title" style={{ color: 'var(--gold)' }}>🥉 3rd Place</div>
                <div className="bracket-round-body">
                  <div className="bracket-match">
                    <div className={`bracket-match-inner ${tp.status === 'done' ? 'winner-decided' : ''}`} style={{ borderColor: 'rgba(205,127,50,.5)' }}>
                      {([tp.teamA, tp.teamB] as (Team | null)[]).map((t, idx) => {
                        const isDone = tp.status === 'done'
                        const isWin = isDone && (tp.winner as Team | null)?.id === t?.id
                        const score = matchScoreDisplay(tp, tp.bestOf ?? settings.thirdBestOf, settings.winScore, settings.winBy2)
                        return (
                          <div key={idx} className={`bracket-slot ${isWin ? 'winner-slot' : ''}`}>
                            {t ? <>{t.name}{groupBadge(t)}</> : <span style={{ color: 'var(--text3)' }}>TBD</span>}
                            {score && <span className="bracket-slot-score">{idx === 0 ? score.scoreA : score.scoreB}</span>}
                          </div>
                        )
                      })}
                      {tp.teamA && tp.teamB && tp.status !== 'done' && (
                        <div className="bracket-match-action no-print">
                          <button className="btn btn-outline btn-sm" onClick={() => openScore({ type: 'bracket', matchId: tp.id })}>Score</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Match detail cards */}
      <div style={{ marginTop: 20 }}>
        {tp && tp.teamA && tp.teamB && (
          <>
            <div className="card-title mb8">🥉 3rd Place Match</div>
            <MatchCard match={tp} matchType="bracket" bestOf={tp.bestOf ?? settings.thirdBestOf} is3rdPlace testingMode={state.testingMode} />
          </>
        )}
        {bracketRounds.map(round => (
          <div key={round.title}>
            <div className="card-title mb8">{round.title}</div>
            {round.matches
              .filter(m => m.teamA && m.teamB && !(m.teamA as Team).isBye && !(m.teamB as Team).isBye)
              .map(m => (
                <MatchCard key={m.id} match={m} matchType="bracket" bestOf={m.bestOf ?? settings.sfBestOf} testingMode={state.testingMode} />
              ))
            }
          </div>
        ))}
      </div>
    </div>
  )
}
