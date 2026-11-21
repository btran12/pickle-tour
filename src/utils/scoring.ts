import { DEFAULT_STAGE_SCORING } from '../types'
import type { Match, Settings, StageKey, StageScoring, Team, TournamentState } from '../types'

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

/**
 * Which stage a match belongs to. Round-robin matches (no roundIdx) use the
 * group-stage rules, as do bracket rounds before the quarter-finals.
 */
export function stageForMatch(match: Match, totalBracketRounds: number): StageKey {
  if (match.is3rdPlace) return 'third'
  const ri = match.roundIdx
  if (ri === undefined || ri < 0 || totalBracketRounds <= 0) return 'group'
  if (ri === totalBracketRounds - 1) return 'final'
  if (ri === totalBracketRounds - 2) return 'semi'
  if (totalBracketRounds >= 3 && ri === totalBracketRounds - 3) return 'quarter'
  return 'group'
}

/** Scoring rules for a stage, falling back to the defaults for old saved states. */
export function scoringForStage(settings: Settings, stage: StageKey): StageScoring {
  return settings.scoringByStage?.[stage] ?? DEFAULT_STAGE_SCORING
}

export function scoringForMatch(match: Match, settings: Settings, totalBracketRounds: number): StageScoring {
  return scoringForStage(settings, stageForMatch(match, totalBracketRounds))
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

/** Legend for the Tiebreak column shown next to standings. */
export const TIEBREAK_LEGEND = 'Shown when teams are level: H2H = head-to-head, GW = games won, PD = point differential, Pts = points scored.'
export const TIEBREAK_KEY = 'H2H = head-to-head · GW = games won · PD = point differential · Pts = points scored'

export interface Standing {
  team: Team
  wins: number
  losses: number
  gamesWon: number
  gamesLost: number
  pd: number
  pointsFor: number
  /** Short explanation of the tiebreaker that ordered this team, or '' if not tied. */
  tiebreakReason: string
}

interface HeadToHeadRecord {
  wins: number
  losses: number
  gamesWon: number
  gamesLost: number
  pd: number
  pointsFor: number
}

const signed = (n: number) => (n > 0 ? `+${n}` : String(n))

/**
 * Order teams that are level on record, games won, and point differential by
 * how they fared against each other (mini-league). Falls back to total points
 * scored, then team id so the order is always deterministic. Also records a
 * short reason for the column shown in the standings tables.
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
    const scoring = scoringForStage(settings, 'group')
    m.games.forEach(g => {
      const w = gameWin(g.scoreA, g.scoreB, scoring.winScore, scoring.winBy2)
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

  const ordered = [...tied].sort((a, b) => {
    const ra = rec[a.team.id]
    const rb = rec[b.team.id]
    return rb.wins - ra.wins
      || rb.pd - ra.pd
      || rb.gamesWon - ra.gamesWon
      || rb.pointsFor - ra.pointsFor
      || b.pointsFor - a.pointsFor
      || a.team.id - b.team.id
  })

  const firstH2H = rec[ordered[0].team.id]
  const h2hRecordVaries = ordered.some(s => {
    const r = rec[s.team.id]
    return r.wins !== firstH2H.wins || r.losses !== firstH2H.losses
  })
  const h2hPdVaries = ordered.some(s => rec[s.team.id].pd !== firstH2H.pd)
  const h2hGamesVary = ordered.some(s => rec[s.team.id].gamesWon !== firstH2H.gamesWon)
  const h2hPointsVary = ordered.some(s => rec[s.team.id].pointsFor !== firstH2H.pointsFor)
  const overallPointsVary = ordered.some(s => s.pointsFor !== ordered[0].pointsFor)

  ordered.forEach(s => {
    const r = rec[s.team.id]
    if (h2hRecordVaries) s.tiebreakReason = `H2H ${r.wins}–${r.losses}`
    else if (h2hPdVaries) s.tiebreakReason = `H2H ${signed(r.pd)} PD`
    else if (h2hGamesVary) s.tiebreakReason = `H2H ${r.gamesWon} GW`
    else if (h2hPointsVary) s.tiebreakReason = `H2H ${r.pointsFor} pts`
    else if (overallPointsVary) s.tiebreakReason = `Pts ${s.pointsFor}`
    else s.tiebreakReason = 'Dead heat'
  })

  return ordered
}

function applyHeadToHead(sorted: Standing[], matches: Match[], settings: Settings): Standing[] {
  const out: Standing[] = []
  let i = 0
  while (i < sorted.length) {
    let j = i + 1
    while (
      j < sorted.length
      && sorted[j].wins === sorted[i].wins
      && sorted[j].losses === sorted[i].losses
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

/**
 * Teams level on record but separated by the earlier tiebreakers (games won
 * or point differential) still get a reason so the table always explains the
 * order. Head-to-head reasons set above are left untouched.
 */
function markRecordTiebreaks(rows: Standing[]): Standing[] {
  let i = 0
  while (i < rows.length) {
    let j = i + 1
    while (j < rows.length && rows[j].wins === rows[i].wins && rows[j].losses === rows[i].losses) j++
    const group = rows.slice(i, j)
    if (group.length > 1) {
      const first = group[0]
      const gamesVary = group.some(s => s.gamesWon !== first.gamesWon)
      const pdVaries = group.some(s => s.pd !== first.pd)
      group.forEach(s => {
        if (s.tiebreakReason) return
        if (gamesVary) s.tiebreakReason = `GW ${s.gamesWon}`
        else if (pdVaries) s.tiebreakReason = `PD ${signed(s.pd)}`
        else s.tiebreakReason = 'Dead heat'
      })
    }
    i = j
  }
  return rows
}

export function computeStandings(gi: number, state: TournamentState): Standing[] {
  const matches = state.rrMatches[gi] ?? []
  const map: Record<number, Standing> = {}
  state.groups[gi]?.teams.forEach(t => {
    map[t.id] = { team: t, wins: 0, losses: 0, gamesWon: 0, gamesLost: 0, pd: 0, pointsFor: 0, tiebreakReason: '' }
  })
  matches.forEach(m => {
    if (m.status !== 'done' || !m.winner) return
    const wId = (m.winner as Team).id
    const lId = wId === (m.teamA as Team)?.id ? (m.teamB as Team)?.id : (m.teamA as Team)?.id
    if (map[wId]) map[wId].wins++
    if (map[lId]) map[lId].losses++
    const scoring = scoringForStage(state.settings, 'group')
    m.games.forEach(g => {
      const w = gameWin(g.scoreA, g.scoreB, scoring.winScore, scoring.winBy2)
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
  return markRecordTiebreaks(applyHeadToHead(sorted, matches, state.settings))
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
