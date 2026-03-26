import { useState, useEffect } from 'react'
import { useTournament } from '../../context/TournamentContext'
import { computeStandings, matchScoreDisplay, gamesWon, fmtTime, gameWin } from '../../utils/scoring'
import { allMatchesFlat } from '../../context/reducer'
import type { Match, Team } from '../../types'

function useClock() {
  const [time, setTime] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return time
}

interface Props { forceOpen?: boolean }

export function SpectatorOverlay({ forceOpen }: Props) {
  const { state, dispatch } = useTournament()
  const now = useClock()
  const { role, tournamentId, tournamentName, bracketRounds, bracketSeedGroups, groups,
    thirdPlaceMatch, rrMatches, schedule, courts, settings } = state

  // Show when forced (viewer role) OR when admin clicks 📺 Live
  // The 📺 button just navigates to bracket page, not this overlay in the React version
  // This overlay is primarily for viewers
  if (!forceOpen) return null

  // Build map of matchId → group info for RR matches
  const rrMatchGroupMap = new Map<number, string>()
  Object.entries(rrMatches).forEach(([gi, matches]) => {
    const groupName = groups[Number(gi)]?.name ?? `Group ${Number(gi) + 1}`
    matches.forEach(m => rrMatchGroupMap.set(m.id, groupName))
  })

  const totalBracketRounds = bracketRounds.length

  const getStageLabel = (m: Match): string => {
    if (rrMatchGroupMap.has(m.id)) return 'Round Robin'
    if (m.is3rdPlace) return '3rd Place'
    const ri = m.roundIdx ?? 0
    if (ri === totalBracketRounds - 1) return 'Final'
    if (ri === totalBracketRounds - 2) return 'Semi-Finals'
    if (ri === totalBracketRounds - 3) return 'Quarter-Finals'
    return `Round ${ri + 1}`
  }

  const fin = bracketRounds[bracketRounds.length - 1]?.matches[0]
  const champ = fin?.status === 'done' ? (fin.winner as Team | null) : null
  const tp = thirdPlaceMatch
  const third = tp?.status === 'done' ? (tp.winner as Team | null) : null
  const allMatches = allMatchesFlat(state)
  const pending = allMatches.filter(m => m.status !== 'done' && m.teamA && m.teamB && !(m.teamA as Team).isBye && !(m.teamB as Team).isBye)
  const done = allMatches.filter(m => m.status === 'done' && !(m.teamA as Team)?.isBye && !(m.teamB as Team)?.isBye).slice(-4).reverse()

  const groupBadge = (team: Team | null | undefined) => {
    if (!team || team.isBye) return null
    const gi = bracketSeedGroups[team.id]
    if (gi === undefined) return null
    const g = groups[gi]
    return g ? <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, padding: '1px 3px', borderRadius: 2, background: 'var(--accent-dim)', color: 'var(--text3)', marginLeft: 3 }}>{g.name}</span> : null
  }

  return (
    <div className="spectator-overlay open" style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 20px', background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="logo">Pickle<span>Bracket</span></div>
          <div>
            <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 18, letterSpacing: 2, color: 'var(--text)' }}>{tournamentName}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 28, letterSpacing: 2, color: 'var(--text)', lineHeight: 1 }}>
            {now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="live-dot" />
            <span style={{ fontSize: 12, color: 'var(--red)', fontWeight: 700, letterSpacing: 1 }}>LIVE</span>
          </div>
          {role !== 'viewer' && (
            <button className="btn btn-outline btn-sm no-print" onClick={() => dispatch({ type: 'SET_PAGE', page: 'bracket' })}>✕ Close</button>
          )}
        </div>
      </div>

      {/* Champion banner */}
      {champ && (
        <div style={{ background: 'var(--accent-dim)', borderBottom: '1px solid var(--border2)', padding: '10px 20px', fontSize: 14, fontWeight: 600, color: 'var(--accent)', textAlign: 'center' }}>
          🏆 Champion: {champ.name}{third ? ` · 🥉 3rd: ${third.name}` : ''}
        </div>
      )}

      {/* 4-panel grid */}
      <div className="spectator-panels" style={{ flex: 1, gap: 1, background: 'var(--border)', overflow: 'hidden', minHeight: 0 }}>

        {/* Panel 1: Standings */}
        <Panel title="📊 Standings" accent="var(--blue)">
          {Object.keys(rrMatches).length ? (
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {groups.map((g, gi) => {
                const st = computeStandings(gi, state)
                return (
                  <div key={g.id} style={{ flex: 1, minWidth: 160 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text2)', marginBottom: 10 }}>{g.name}</div>
                    <table className="standings-table" style={{ fontSize: 17 }}>
                      <thead>
                        <tr>
                          <th style={{ fontSize: 13 }}>#</th>
                          <th style={{ fontSize: 13 }}>Team</th>
                          <th style={{ fontSize: 13 }}>W</th>
                          <th style={{ fontSize: 13 }}>L</th>
                        </tr>
                      </thead>
                      <tbody>
                        {st.map((s, i) => (
                          <tr key={s.team.id}>
                            <td><span className={`rank-num rank-${i + 1}`} style={{ fontSize: 17 }}>{i + 1}</span></td>
                            <td style={{ fontSize: 17, fontWeight: 600 }}>{s.team.name}</td>
                            <td style={{ color: 'var(--accent)', fontSize: 17, fontWeight: 700 }}>{s.wins}</td>
                            <td style={{ color: 'var(--red)', fontSize: 17, fontWeight: 700 }}>{s.losses}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ color: 'var(--text3)', fontSize: 15 }}>No round robin data yet</div>
          )}
        </Panel>

        {/* Panel 2: Bracket */}
        <Panel title="🏆 Bracket" accent="var(--gold)">
          {bracketRounds.length ? (
            <div style={{ overflowX: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'stretch', minWidth: 'max-content', gap: 0 }}>
                {bracketRounds.map((round, ri) => (
                  <>
                    <div key={round.title} style={{ display: 'flex', flexDirection: 'column' }}>
                      <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 17, letterSpacing: 1, color: 'var(--text3)', textAlign: 'center', padding: '0 14px 8px', flexShrink: 0 }}>{round.title}</div>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-around' }}>
                        {round.matches.map(m => {
                          const isDone = m.status === 'done'
                          const tA = m.teamA as Team | null
                          const tB = m.teamB as Team | null
                          const winner = m.winner as Team | null
                          const sd = matchScoreDisplay(m, m.bestOf ?? settings.sfBestOf, settings.winScore, settings.winBy2)
                          return (
                            <div key={m.id} style={{ margin: 6, background: 'var(--surface2)', border: `1.5px solid ${isDone ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 'var(--r)', width: 220, overflow: 'hidden' }}>
                              {[{ team: tA, score: sd ? String(sd.scoreA) : '' }, { team: tB, score: sd ? String(sd.scoreB) : '' }].map(({ team: t, score }, idx) => {
                                const isWin = isDone && winner?.id === t?.id
                                return (
                                  <div key={idx} style={{ padding: '8px 11px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 15, fontWeight: 600, borderBottom: idx === 0 ? '1px solid var(--border)' : undefined, background: isWin ? 'var(--accent-dim)' : undefined, color: isWin ? 'var(--accent)' : 'var(--text)', borderLeft: isWin ? '3px solid var(--accent)' : undefined }}>
                                    <span>{t?.name ?? 'TBD'}{groupBadge(t)}</span>
                                    {sd && m.games.length > 0 && <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 15, fontWeight: 700 }}>{score}</span>}
                                  </div>
                                )
                              })}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                    {ri < bracketRounds.length - 1 && (
                      <div key={`conn-${ri}`} className="bracket-connector-col">
                        {Array.from({ length: bracketRounds[ri + 1].matches.length }, (_, ci) => (
                          <div key={ci} className="bc-group"><div className="bc-top-half" /><div className="bc-bottom-half" /></div>
                        ))}
                      </div>
                    )}
                  </>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ color: 'var(--text3)', fontSize: 15 }}>Bracket not generated yet</div>
          )}
        </Panel>

        {/* Panel 3: Upcoming */}
        <Panel title="⚡ On Court / Upcoming" accent="var(--accent)">
          {pending.length ? (
            pending.map(m => {
              const sc = schedule[m.id]
              const court = sc ? courts.find(c => c.id === sc.courtId) : null
              const tA = m.teamA as Team
              const tB = m.teamB as Team
              const stageLabel = getStageLabel(m)
              const isRR = rrMatchGroupMap.has(m.id)
              const groupName = rrMatchGroupMap.get(m.id)
              return (
                <div key={m.id} style={{ padding: '12px 14px', background: 'var(--surface2)', border: '1.5px solid var(--border)', borderRadius: 'var(--r)', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', padding: '2px 8px', borderRadius: 99, background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--border2)' }}>
                      {stageLabel}
                    </span>
                    {isRR && groupName && (
                      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: 'var(--surface3)', color: 'var(--text2)', border: '1px solid var(--border)' }}>
                        {groupName}
                      </span>
                    )}
                    {court && <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--purple)' }}>{court.name}</span>}
                    {sc?.time && <span style={{ fontSize: 13, color: 'var(--text3)' }}>{fmtTime(sc.time)}</span>}
                    <span className={`match-status-badge status-${m.status}`}>{m.status === 'live' ? '🔴 Live' : 'Upcoming'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 26, fontWeight: 700, color: 'var(--text)', lineHeight: 1.1 }}>{tA.name}</div>
                      {m.games.length > 0 && <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 38, color: 'var(--accent)', lineHeight: 1 }}>{gamesWon(m, 'A', settings.winScore, settings.winBy2)}</div>}
                    </div>
                    <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, color: 'var(--text3)', flexShrink: 0 }}>VS</div>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 26, fontWeight: 700, color: 'var(--text)', lineHeight: 1.1 }}>{tB.name}</div>
                      {m.games.length > 0 && <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 38, color: 'var(--accent)', lineHeight: 1 }}>{gamesWon(m, 'B', settings.winScore, settings.winBy2)}</div>}
                    </div>
                  </div>
                </div>
              )
            })
          ) : (
            <div style={{ color: 'var(--text3)', fontSize: 15 }}>No upcoming matches</div>
          )}
        </Panel>

        {/* Panel 4: Recent Results */}
        <Panel title="✅ Recent Results" accent="var(--text2)">
          {done.length ? (
            done.map(m => {
              const tA = m.teamA as Team
              const tB = m.teamB as Team
              const winner = m.winner as Team | null
              const bestOf = m.bestOf ?? settings.groupStageBestOf
              const isRR = rrMatchGroupMap.has(m.id)
              const groupName = rrMatchGroupMap.get(m.id)
              const stageLabel = getStageLabel(m)

              // For single-game matches show actual point score; for multi-game show games won
              const scoreA = bestOf === 1
                ? (m.games[0]?.scoreA ?? 0)
                : gamesWon(m, 'A', settings.winScore, settings.winBy2)
              const scoreB = bestOf === 1
                ? (m.games[0]?.scoreB ?? 0)
                : gamesWon(m, 'B', settings.winScore, settings.winBy2)

              const winA = winner?.id === tA.id
              const winB = winner?.id === tB.id

              return (
                <div key={m.id} style={{ padding: '12px 14px', background: 'var(--surface2)', border: '1.5px solid var(--border)', borderRadius: 'var(--r)', marginBottom: 8 }}>
                  {/* Stage + group badges */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', padding: '2px 8px', borderRadius: 99, background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--border2)' }}>
                      {stageLabel}
                    </span>
                    {isRR && groupName && (
                      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: 'var(--surface3)', color: 'var(--text2)', border: '1px solid var(--border)' }}>
                        {groupName}
                      </span>
                    )}
                  </div>

                  {/* Scoreboard: TEAM A  score — score  TEAM B */}
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ flex: 1, textAlign: 'right', paddingRight: 12, overflow: 'hidden' }}>
                      <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 42, color: winA ? 'var(--accent)' : 'var(--text)', lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tA.name}</div>
                      {winA && <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 2, fontWeight: 600 }}>Winner</div>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 42, lineHeight: 1, color: winA ? 'var(--accent)' : 'var(--text3)' }}>{scoreA}</span>
                      <span style={{ fontSize: 22, color: 'var(--text3)', fontWeight: 300, lineHeight: 1 }}>–</span>
                      <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 42, lineHeight: 1, color: winB ? 'var(--accent)' : 'var(--text3)' }}>{scoreB}</span>
                    </div>
                    <div style={{ flex: 1, paddingLeft: 12, overflow: 'hidden' }}>
                      <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 42, color: winB ? 'var(--accent)' : 'var(--text)', lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tB.name}</div>
                      {winB && <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 2, fontWeight: 600 }}>Winner</div>}
                    </div>
                  </div>

                  {/* Per-game scores (only for multi-game matches) */}
                  {bestOf > 1 && m.games.length > 0 && (
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 8, justifyContent: 'center' }}>
                      {m.games.map((g, gi) => (
                        <span key={gi} className={`game-pip ${gameWin(g.scoreA, g.scoreB, settings.winScore, settings.winBy2) === 0 ? 'win' : 'loss'}`}>
                          {g.scoreA}–{g.scoreB}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )
            })
          ) : (
            <div style={{ color: 'var(--text3)', fontSize: 13 }}>No completed matches yet</div>
          )}
        </Panel>
      </div>
    </div>
  )
}

function Panel({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--surface)', padding: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 16, letterSpacing: 2, color: accent, marginBottom: 10, paddingBottom: 7, borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        {title}
      </div>
      <div style={{ overflowY: 'auto', overflowX: 'hidden', flex: 1, minHeight: 0 }}>
        {children}
      </div>
    </div>
  )
}
