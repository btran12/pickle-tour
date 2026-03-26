import { useTournament } from '../../context/TournamentContext'
import { useModal } from '../../context/ModalContext'
import { MatchCard } from '../shared/MatchCard'
import { matchScoreDisplay } from '../../utils/scoring'
import type { Team } from '../../types'

export function BracketPage() {
  const { state, dispatch } = useTournament()
  const { openScore } = useModal()
  const { bracketRounds, bracketMatches, thirdPlaceMatch, bracketSeedGroups, groups, settings } = state

  const fin = bracketRounds[bracketRounds.length - 1]?.matches[0]
  const champ = fin?.status === 'done' ? (fin.winner as Team | null) : null
  const runnerUp = fin?.status === 'done' ? (fin.loser as Team | null) : null
  const tp = thirdPlaceMatch
  const third = tp?.status === 'done' ? (tp.winner as Team | null) : null
  const tournamentDone = !!champ && (!tp || tp.status === 'done')

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
        <div 
          style={{ 
            fontSize: 20,
            fontWeight: 600,
            marginBottom: 24,
            padding: '16px 0',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            color: 'var(--text1)'
          }}
        >
          <div style={{ fontSize: 28 }}>🏆 <span style={{ letterSpacing: 1 }}>{champ.name}</span></div>
          {runnerUp && (
            <div style={{ fontSize: 22, color: 'var(--text2)' }}>
              🥈 <span style={{ letterSpacing: 0.5 }}>{runnerUp.name}</span>
            </div>
          )}
          {third && (
            <div style={{ fontSize: 22, color: 'var(--text3)' }}>
              🥉 <span style={{ letterSpacing: 0.5 }}>{third.name}</span>
            </div>
          )}
          {tournamentDone && (
            <button
              className="btn btn-sm btn-primary no-print"
              style={{ marginTop: 8, alignSelf: 'center' }}
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
                      const canOpenModal = !state.testingMode && tA && tB && !tA.isBye && !tB.isBye
                      
                      const handleQuickScore = (teamId: number) => {
                        if (isDone || !state.testingMode) return
                        const winnerIsA = teamId === tA?.id
                        dispatch({
                          type: 'SUBMIT_SCORE',
                          matchType: 'bracket',
                          matchId: m.id,
                          games: [{ scoreA: winnerIsA ? 11 : 0, scoreB: winnerIsA ? 0 : 11 }]
                        })
                      }
                      
                      return (
                        <div key={m.id} className="bracket-match">
                          <div 
                            className={`bracket-match-inner ${isDone ? 'winner-decided' : ''}`}
                            onClick={() => canOpenModal ? openScore({ type: 'bracket', matchId: m.id }) : undefined}
                            style={canOpenModal ? { cursor: 'pointer' } : undefined}
                          >
                            <div 
                              className={`bracket-slot ${isWinA ? 'winner-slot' : ''}`}
                              onClick={(e) => {
                                if (state.testingMode) {
                                  e.stopPropagation()
                                  handleQuickScore(tA?.id ?? 0)
                                }
                              }}
                              style={state.testingMode && !isDone && tA ? { cursor: 'pointer' } : undefined}
                            >
                              {tA?.isBye ? <span style={{ color: 'var(--text3)', fontStyle: 'italic' }}>BYE</span>
                                : tA ? <>{tA.name}{groupBadge(tA)}</> : <span style={{ color: 'var(--text3)' }}>TBD</span>}
                              {hasScore && <span className="bracket-slot-score">{getScore(m, 'A')}</span>}
                            </div>
                            <div 
                              className={`bracket-slot ${isWinB ? 'winner-slot' : ''}`}
                              onClick={(e) => {
                                if (state.testingMode) {
                                  e.stopPropagation()
                                  handleQuickScore(tB?.id ?? 0)
                                }
                              }}
                              style={state.testingMode && !isDone && tB ? { cursor: 'pointer' } : undefined}
                            >
                              {tB?.isBye ? <span style={{ color: 'var(--text3)', fontStyle: 'italic' }}>BYE</span>
                                : tB ? <>{tB.name}{groupBadge(tB)}</> : <span style={{ color: 'var(--text3)' }}>TBD</span>}
                              {hasScore && <span className="bracket-slot-score">{getScore(m, 'B')}</span>}
                            </div>
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
                    <div 
                      className={`bracket-match-inner ${tp.status === 'done' ? 'winner-decided' : ''}`} 
                      onClick={() => tp.teamA && tp.teamB && !state.testingMode ? openScore({ type: 'bracket', matchId: tp.id }) : undefined}
                      style={{ borderColor: 'rgba(205,127,50,.5)', cursor: tp.teamA && tp.teamB && !state.testingMode ? 'pointer' : undefined }}
                    >
                      {([tp.teamA, tp.teamB] as (Team | null)[]).map((t, idx) => {
                        const isDone = tp.status === 'done'
                        const isWin = isDone && (tp.winner as Team | null)?.id === t?.id
                        const score = matchScoreDisplay(tp, tp.bestOf ?? settings.thirdBestOf, settings.winScore, settings.winBy2)
                        
                        const handleQuickScore = () => {
                          if (isDone || !state.testingMode || !t) return
                          const otherTeam = idx === 0 ? tp.teamB : tp.teamA
                          const winnerIsA = idx === 0
                          dispatch({
                            type: 'SUBMIT_SCORE',
                            matchType: 'bracket',
                            matchId: tp.id,
                            games: [{ scoreA: winnerIsA ? 11 : 0, scoreB: winnerIsA ? 0 : 11 }]
                          })
                        }
                        
                        return (
                          <div 
                            key={idx} 
                            className={`bracket-slot ${isWin ? 'winner-slot' : ''}`}
                            onClick={(e) => {
                              if (state.testingMode) {
                                e.stopPropagation()
                                handleQuickScore()
                              }
                            }}
                            style={state.testingMode && !isDone && t ? { cursor: 'pointer' } : undefined}
                          >
                            {t ? <>{t.name}{groupBadge(t)}</> : <span style={{ color: 'var(--text3)' }}>TBD</span>}
                            {score && <span className="bracket-slot-score">{idx === 0 ? score.scoreA : score.scoreB}</span>}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
