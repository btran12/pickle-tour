import { useTournament } from '../../context/TournamentContext'
import { computeStandings, matchScoreDisplay, gamesWon, fmtTime, gameWin } from '../../utils/scoring'
import { allMatchesFlat } from '../../context/reducer'
import type { Team } from '../../types'

interface Props { forceOpen?: boolean }

export function SpectatorOverlay({ forceOpen }: Props) {
  const { state, dispatch } = useTournament()
  const { role, tournamentId, tournamentName, bracketRounds, bracketSeedGroups, groups,
    thirdPlaceMatch, rrMatches, schedule, courts, settings } = state

  // Show when forced (viewer role) OR when admin clicks 📺 Live
  // The 📺 button just navigates to bracket page, not this overlay in the React version
  // This overlay is primarily for viewers
  if (!forceOpen) return null

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="live-dot" />
          <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>LIVE</span>
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
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 1, background: 'var(--border)', overflow: 'hidden', minHeight: 0 }}>

        {/* Panel 1: Standings */}
        <Panel title="📊 Standings" accent="var(--blue)">
          {Object.keys(rrMatches).length ? (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {groups.map((g, gi) => {
                const st = computeStandings(gi, state)
                return (
                  <div key={g.id} style={{ flex: 1, minWidth: 140 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text3)', marginBottom: 6 }}>{g.name}</div>
                    <table className="standings-table">
                      <thead><tr><th>#</th><th>Team</th><th>W</th><th>L</th></tr></thead>
                      <tbody>
                        {st.map((s, i) => (
                          <tr key={s.team.id}>
                            <td><span className={`rank-num rank-${i + 1}`}>{i + 1}</span></td>
                            <td style={{ fontSize: 12 }}>{s.team.name}</td>
                            <td style={{ color: 'var(--accent)', fontSize: 12 }}>{s.wins}</td>
                            <td style={{ color: 'var(--red)', fontSize: 12 }}>{s.losses}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ color: 'var(--text3)', fontSize: 13 }}>No round robin data yet</div>
          )}
        </Panel>

        {/* Panel 2: Bracket */}
        <Panel title="🏆 Bracket" accent="var(--gold)">
          {bracketRounds.length ? (
            <div style={{ overflowX: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'stretch', minWidth: 'max-content', gap: 0 }}>
                {bracketRounds.map((round, ri) => (
                  <>
                    <div key={round.title} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around' }}>
                      <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 12, letterSpacing: 1, color: 'var(--text3)', textAlign: 'center', padding: '0 12px 6px' }}>{round.title}</div>
                      {round.matches.map(m => {
                        const isDone = m.status === 'done'
                        const tA = m.teamA as Team | null
                        const tB = m.teamB as Team | null
                        const winner = m.winner as Team | null
                        const sd = matchScoreDisplay(m, m.bestOf ?? settings.sfBestOf, settings.winScore, settings.winBy2)
                        return (
                          <div key={m.id} style={{ margin: 5, background: 'var(--surface2)', border: `1px solid ${isDone ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 'var(--r)', width: 160, overflow: 'hidden' }}>
                            {[{ team: tA, score: sd ? String(sd.scoreA) : '' }, { team: tB, score: sd ? String(sd.scoreB) : '' }].map(({ team: t, score }, idx) => {
                              const isWin = isDone && winner?.id === t?.id
                              return (
                                <div key={idx} style={{ padding: '5px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, fontWeight: 500, borderBottom: idx === 0 ? '1px solid var(--border)' : undefined, background: isWin ? 'var(--accent-dim)' : undefined, color: isWin ? 'var(--accent)' : undefined, borderLeft: isWin ? '2px solid var(--accent)' : undefined }}>
                                  <span>{t?.name ?? 'TBD'}{groupBadge(t)}</span>
                                  {sd && m.games.length > 0 && <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11 }}>{score}</span>}
                                </div>
                              )
                            })}
                          </div>
                        )
                      })}
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
            <div style={{ color: 'var(--text3)', fontSize: 13 }}>Bracket not generated yet</div>
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
              return (
                <div key={m.id} style={{ padding: '9px 10px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', marginBottom: 7 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 11, color: 'var(--purple)' }}>{court?.name ?? ''}</span>
                    <span style={{ fontSize: 11, color: 'var(--text3)' }}>{sc?.time ? fmtTime(sc.time) : ''}</span>
                    <span className={`match-status-badge status-${m.status}`} style={{ fontSize: 9 }}>{m.status === 'live' ? '🔴 Live' : 'Upcoming'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{tA.name}</div>
                      {m.games.length > 0 && <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 28, color: 'var(--accent)' }}>{gamesWon(m, 'A', settings.winScore, settings.winBy2)}</div>}
                    </div>
                    <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 14, color: 'var(--text3)' }}>VS</div>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{tB.name}</div>
                      {m.games.length > 0 && <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 28, color: 'var(--accent)' }}>{gamesWon(m, 'B', settings.winScore, settings.winBy2)}</div>}
                    </div>
                  </div>
                </div>
              )
            })
          ) : (
            <div style={{ color: 'var(--text3)', fontSize: 13 }}>No upcoming matches</div>
          )}
        </Panel>

        {/* Panel 4: Recent Results */}
        <Panel title="✅ Recent Results" accent="var(--text2)">
          {done.length ? (
            done.map(m => {
              const tA = m.teamA as Team
              const tB = m.teamB as Team
              const winner = m.winner as Team | null
              const sd = matchScoreDisplay(m, m.bestOf ?? settings.rrBestOf, settings.winScore, settings.winBy2)
              return (
                <div key={m.id} style={{ padding: '9px 10px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', marginBottom: 7 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: winner?.id === tA.id ? 'var(--accent)' : 'var(--text2)' }}>{tA.name}</div>
                      <div style={{ fontSize: 12, fontWeight: 600, marginTop: 4, color: winner?.id === tB.id ? 'var(--accent)' : 'var(--text2)' }}>{tB.name}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 26, color: winner?.id === tA.id ? 'var(--accent)' : 'var(--text3)' }}>{sd ? sd.scoreA : gamesWon(m, 'A', settings.winScore, settings.winBy2)}</div>
                      <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 26, color: winner?.id === tB.id ? 'var(--accent)' : 'var(--text3)' }}>{sd ? sd.scoreB : gamesWon(m, 'B', settings.winScore, settings.winBy2)}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 5 }}>
                    {m.games.map((g, gi) => (
                      <span key={gi} className={`game-pip ${gameWin(g.scoreA, g.scoreB, settings.winScore, settings.winBy2) === 0 ? 'win' : 'loss'}`} style={{ fontSize: 10 }}>{g.scoreA}–{g.scoreB}</span>
                    ))}
                  </div>
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
