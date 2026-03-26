import type { Match, Team, TournamentState } from '../types'

export interface ScoreDisplay {
  scoreA: number
  scoreB: number
  loserA: boolean
  loserB: boolean
  pips: Array<{ scoreA: number; scoreB: number; winA: boolean; winB: boolean }>
}

export function gameWin(sA: number, sB: number, winScore: number, winBy2: boolean): 0 | 1 | -1 {
  if (sA >= winScore && (!winBy2 || sA - sB >= 2)) return 0
  if (sB >= winScore && (!winBy2 || sB - sA >= 2)) return 1
  return -1
}

export function gamesWon(match: Match, side: 'A' | 'B', winScore: number, winBy2: boolean): number {
  return match.games.filter(g => {
    const w = gameWin(g.scoreA, g.scoreB, winScore, winBy2)
    return side === 'A' ? w === 0 : w === 1
  }).length
}

export function matchScoreDisplay(
  match: Match,
  bestOf: number,
  winScore: number,
  winBy2: boolean,
): ScoreDisplay | null {
  if (!match.games.length) return null
  const isDone = match.status === 'done'
  const tA = match.teamA as Team
  const tB = match.teamB as Team
  const wA = isDone && match.winner != null && (match.winner as Team).id === tA?.id
  const wB = isDone && match.winner != null && (match.winner as Team).id === tB?.id

  if (bestOf === 1) {
    const g = match.games[0]
    return {
      scoreA: g.scoreA,
      scoreB: g.scoreB,
      loserA: isDone && !wA,
      loserB: isDone && !wB,
      pips: [],
    }
  }

  const gwA = gamesWon(match, 'A', winScore, winBy2)
  const gwB = gamesWon(match, 'B', winScore, winBy2)
  const pips = match.games.map(g => {
    const w = gameWin(g.scoreA, g.scoreB, winScore, winBy2)
    return { scoreA: g.scoreA, scoreB: g.scoreB, winA: w === 0, winB: w === 1 }
  })
  return {
    scoreA: gwA,
    scoreB: gwB,
    loserA: isDone && !wA,
    loserB: isDone && !wB,
    pips,
  }
}

export interface Standing {
  team: Team
  wins: number
  losses: number
  gamesWon: number
  gamesLost: number
  pd: number
}

export function computeStandings(gi: number, state: TournamentState): Standing[] {
  const matches = state.rrMatches[gi] ?? []
  const map: Record<number, Standing> = {}
  state.groups[gi]?.teams.forEach(t => {
    map[t.id] = { team: t, wins: 0, losses: 0, gamesWon: 0, gamesLost: 0, pd: 0 }
  })
  matches.forEach(m => {
    if (m.status !== 'done' || !m.winner) return
    const wId = (m.winner as Team).id
    const lId = wId === (m.teamA as Team)?.id ? (m.teamB as Team)?.id : (m.teamA as Team)?.id
    if (map[wId]) map[wId].wins++
    if (map[lId]) map[lId].losses++
    m.games.forEach(g => {
      const w = gameWin(g.scoreA, g.scoreB, state.settings.winScore, state.settings.winBy2)
      const aId = (m.teamA as Team)?.id
      const bId = (m.teamB as Team)?.id
      if (map[aId]) {
        map[aId].pd += g.scoreA - g.scoreB
        if (w === 0) map[aId].gamesWon++; else if (w === 1) map[aId].gamesLost++
      }
      if (map[bId]) {
        map[bId].pd += g.scoreB - g.scoreA
        if (w === 1) map[bId].gamesWon++; else if (w === 0) map[bId].gamesLost++
      }
    })
  })
  return Object.values(map).sort((a, b) => b.wins - a.wins || b.gamesWon - a.gamesWon || b.pd - a.pd)
}

export function getTeamDisplayName(team: Team): string {
  // If team has a proper name, use it
  if (team.name && team.name.trim()) return team.name
  
  // Otherwise, generate from players: "FirstName LastInitial / FirstName LastInitial"
  return team.players
    .map(p => {
      const parts = p.name.trim().split(' ')
      if (parts.length < 2) return parts[0] // If no last name, just use first name
      const firstName = parts[0]
      const lastInitial = parts[parts.length - 1][0]
      return `${firstName} ${lastInitial}`
    })
    .join(' / ')
}

export function fmtTime(t: string): string {
  if (!t) return ''
  const [h, m] = t.split(':')
  const hr = parseInt(h)
  return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`
}

export function fmtTs(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

// Extract score number from HTML score string like '<div class="team-slot-score">11</div>'
export function extractScore(html: string): string {
  return html.match(/>(\d+)</)?.[1] ?? '?'
}
