import type { Match, Settings, Team, TournamentState } from '../types'

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

/**
 * Games needed to win a best-of-N match outright. Used by testing-mode
 * quick scoring so one tap completes the whole match, not just one game.
 */
export function quickWinGames(bestOf: number, winScore: number, teamIsA: boolean): Array<{ scoreA: number; scoreB: number }> {
  const wn = Math.max(1, Math.ceil(bestOf / 2))
  return Array.from({ length: wn }, () => (teamIsA
    ? { scoreA: winScore, scoreB: 0 }
    : { scoreA: 0, scoreB: winScore }))
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
  pointsFor: number
}

interface HeadToHeadRecord {
  wins: number
  losses: number
  gamesWon: number
  gamesLost: number
  pd: number
  pointsFor: number
}

/**
 * Order teams that are level on record, games won, and point differential by
 * how they fared against each other (mini-league). Falls back to total points
 * scored, then team id so the order is always deterministic.
 */
function orderByHeadToHead(tied: Standing[], matches: Match[], settings: Settings): Standing[] {
  const ids = new Set(tied.map(s => s.team.id))
  const rec: Record<number, HeadToHeadRecord> = {}
  tied.forEach(s => {
    rec[s.team.id] = { wins: 0, losses: 0, gamesWon: 0, gamesLost: 0, pd: 0, pointsFor: 0 }
  })

  matches.forEach(m => {
    if (m.status !== 'done' || !m.winner) return
    const aId = (m.teamA as Team | null)?.id
    const bId = (m.teamB as Team | null)?.id
    if (aId == null || bId == null || aId === bId) return
    if (!ids.has(aId) || !ids.has(bId)) return
    const wId = (m.winner as Team).id
    const lId = wId === aId ? bId : aId
    if (!rec[wId] || !rec[lId]) return

    rec[wId].wins++
    rec[lId].losses++
    m.games.forEach(g => {
      const w = gameWin(g.scoreA, g.scoreB, settings.winScore, settings.winBy2)
      rec[aId].pd += g.scoreA - g.scoreB
      rec[bId].pd += g.scoreB - g.scoreA
      rec[aId].pointsFor += g.scoreA
      rec[bId].pointsFor += g.scoreB
      if (w === 0) {
        rec[aId].gamesWon++
        rec[bId].gamesLost++
      } else if (w === 1) {
        rec[bId].gamesWon++
        rec[aId].gamesLost++
      }
    })
  })

  return [...tied].sort((a, b) => {
    const ra = rec[a.team.id]
    const rb = rec[b.team.id]
    return rb.wins - ra.wins
      || rb.pd - ra.pd
      || rb.gamesWon - ra.gamesWon
      || rb.pointsFor - ra.pointsFor
      || b.pointsFor - a.pointsFor
      || a.team.id - b.team.id
  })
}

function applyHeadToHead(sorted: Standing[], matches: Match[], settings: Settings): Standing[] {
  const out: Standing[] = []
  let i = 0
  while (i < sorted.length) {
    let j = i + 1
    while (
      j < sorted.length
      && sorted[j].wins === sorted[i].wins
      && sorted[j].gamesWon === sorted[i].gamesWon
      && sorted[j].pd === sorted[i].pd
    ) {
      j++
    }
    if (j - i > 1) out.push(...orderByHeadToHead(sorted.slice(i, j), matches, settings))
    else out.push(sorted[i])
    i = j
  }
  return out
}

export function computeStandings(gi: number, state: TournamentState): Standing[] {
  const matches = state.rrMatches[gi] ?? []
  const map: Record<number, Standing> = {}
  state.groups[gi]?.teams.forEach(t => {
    map[t.id] = { team: t, wins: 0, losses: 0, gamesWon: 0, gamesLost: 0, pd: 0, pointsFor: 0 }
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
        map[aId].pointsFor += g.scoreA
        if (w === 0) map[aId].gamesWon++; else if (w === 1) map[aId].gamesLost++
      }
      if (map[bId]) {
        map[bId].pd += g.scoreB - g.scoreA
        map[bId].pointsFor += g.scoreB
        if (w === 1) map[bId].gamesWon++; else if (w === 0) map[bId].gamesLost++
      }
    })
  })
  const sorted = Object.values(map).sort((a, b) =>
    b.wins - a.wins || b.gamesWon - a.gamesWon || b.pd - a.pd,
  )
  return applyHeadToHead(sorted, matches, state.settings)
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
