import { useState, useEffect } from 'react'
import { useTournament } from '../../context/TournamentContext'
import { useModal } from '../../context/ModalContext'
import { gameWin } from '../../utils/scoring'
import type { Team, Match } from '../../types'

export function ScoreModal() {
  const { state, dispatch } = useTournament()
  const { scoreCtx, closeScore } = useModal()
  const { rrMatches, bracketMatches, settings } = state

  const match: Match | null = scoreCtx
    ? scoreCtx.type === 'rr'
      ? Object.values(rrMatches).flat().find(m => m.id === scoreCtx.matchId) ?? null
      : bracketMatches.find(m => m.id === scoreCtx.matchId) ?? null
    : null

  const bestOf = scoreCtx
    ? scoreCtx.type === 'rr'
      ? settings.rrBestOf
      : (match?.bestOf ?? settings.sfBestOf)
    : 1

  type GameInput = { a: string; b: string }
  const [games, setGames] = useState<GameInput[]>([])

  useEffect(() => {
    if (!match) return
    const initial: GameInput[] = Array.from({ length: bestOf }, (_, i) => ({
      a: match.games[i]?.scoreA !== undefined ? String(match.games[i].scoreA) : '',
      b: match.games[i]?.scoreB !== undefined ? String(match.games[i].scoreB) : '',
    }))
    setGames(initial)
  }, [scoreCtx, match?.id])

  if (!scoreCtx || !match) return null

  const tA = match.teamA as Team
  const tB = match.teamB as Team
  const wn = Math.ceil(bestOf / 2)

  const gameResult = (i: number) => {
    const a = parseInt(games[i]?.a) || 0
    const b = parseInt(games[i]?.b) || 0
    if (games[i]?.a === '' && games[i]?.b === '') return null
    return gameWin(a, b, settings.winScore, settings.winBy2)
  }

  const handleSubmit = () => {
    const collected: { scoreA: number; scoreB: number }[] = []
    for (let i = 0; i < bestOf; i++) {
      if (games[i]?.a === '' || games[i]?.b === '') continue
      collected.push({ scoreA: parseInt(games[i].a) || 0, scoreB: parseInt(games[i].b) || 0 })
    }
    dispatch({ type: 'SUBMIT_SCORE', matchType: scoreCtx.type, matchId: scoreCtx.matchId, games: collected })
    closeScore()
  }

  return (
    <div className="modal-overlay open" onClick={e => { if (e.target === e.currentTarget) closeScore() }}>
      <div className="modal">
        <div className="modal-title">Enter Score</div>
        <div className="alert alert-info mb12">
          First to {wn} game{wn > 1 ? 's' : ''} wins · Score to {settings.winScore}{settings.winBy2 ? ', win by 2' : ''}
        </div>

        {Array.from({ length: bestOf }, (_, i) => {
          const res = gameResult(i)
          return (
            <div key={i} className="score-game-block">
              <div className="score-game-title">Game {i + 1}</div>
              <div className="score-inputs">
                <div>
                  <label>{tA?.name}</label>
                  <input
                    type="number" min={0} max={99}
                    value={games[i]?.a ?? ''}
                    placeholder="0"
                    onChange={e => {
                      const next = [...games]
                      next[i] = { ...next[i], a: e.target.value }
                      setGames(next)
                    }}
                  />
                </div>
                <div className="score-sep">—</div>
                <div>
                  <label>{tB?.name}</label>
                  <input
                    type="number" min={0} max={99}
                    value={games[i]?.b ?? ''}
                    placeholder="0"
                    onChange={e => {
                      const next = [...games]
                      next[i] = { ...next[i], b: e.target.value }
                      setGames(next)
                    }}
                  />
                </div>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4, minHeight: 13 }}>
                {res === 0 && <span style={{ color: 'var(--accent)' }}>✓ {tA?.name} wins this game</span>}
                {res === 1 && <span style={{ color: 'var(--accent)' }}>✓ {tB?.name} wins this game</span>}
                {res === -1 && games[i] && games[i].a !== '' && <span>In progress ({games[i].a}–{games[i].b})</span>}
              </div>
            </div>
          )
        })}

        <div className="modal-actions">
          <button className="btn btn-outline" onClick={closeScore}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit}>Save Score</button>
        </div>
      </div>
    </div>
  )
}
