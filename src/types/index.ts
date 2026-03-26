// ─── Core domain types ───────────────────────────────

export interface Player {
  name: string
  skill: number // 0 = not set, 1-5
}

export interface Team {
  id: number
  name: string
  players: Player[]
  avgSkill: number
  isBye?: boolean
}

export type ByeTeam = { id: number; name: 'BYE'; isBye: true }

export interface Game {
  scoreA: number
  scoreB: number
}

export type MatchStatus = 'pending' | 'live' | 'done'
export type MatchType = 'rr' | 'bracket'

export interface Match {
  id: number
  teamA: Team | ByeTeam | null
  teamB: Team | ByeTeam | null
  games: Game[]
  winner: Team | ByeTeam | null
  loser?: Team | ByeTeam | null
  status: MatchStatus
  bestOf?: number
  roundIdx?: number
  is3rdPlace?: boolean
  feedFrom?: [number, number?]
  feedLoserFrom?: [number, number]
}

export interface Group {
  id: number
  name: string
  teams: Team[]
}

export interface Court {
  id: number
  name: string
}

export interface ScheduleEntry {
  courtId: number
  time: string
}

export interface HistoryEntry {
  ts: number
  desc: string
  ctx: {
    type: MatchType
    matchId: number
    snapshot: string
  }
}

export interface BracketRound {
  title: string
  matches: Match[]
}

export interface Settings {
  winScore: number
  winBy2: boolean
  groupStageBestOf: number
  advanceCount: number
  quarterFinalsBestOf: number
  sfBestOf: number
  finalsBestOf: number
  thirdBestOf: number
  numGroups: number
  matchDuration: number
}

export type TournamentType = 'singles' | 'doubles'
export type BracketMethod = 'skill' | 'random' | 'manual'
export type WsStatus = 'offline' | 'connecting' | 'connected' | 'syncing' | 'error'
export type Role = 'admin' | 'viewer'
export type Page = 'setup' | 'teams' | 'players' | 'groups' | 'schedule' | 'roundrobin' | 'bracket' | 'history'

// ─── Serialization types (wire format) ──────────────

export interface SerializedMatch extends Omit<Match, 'teamA' | 'teamB' | 'winner' | 'loser'> {
  teamA: { id: number } | ByeTeam | null
  teamB: { id: number } | ByeTeam | null
  winner: { id: number } | ByeTeam | null
  loser: { id: number } | ByeTeam | null
}

export interface SerializedGroup {
  id: number
  name: string
  teamIds: number[]
}

export interface SerializedBracketRound {
  title: string
  matchIds: number[]
}

export interface WireState {
  tType: TournamentType
  bMethod: BracketMethod
  tournamentName: string
  teams: Team[]
  groups: SerializedGroup[]
  rrMatches: Record<string, SerializedMatch[]>
  bracketMatches: SerializedMatch[]
  bracketRounds: SerializedBracketRound[]
  thirdPlaceMatchId: number | null
  courts: Court[]
  schedule: Record<number, ScheduleEntry>
  history: HistoryEntry[]
  settings: Settings
  bracketSeedGroups: Record<number, number>
  _tid: number
  _mid: number
  _cid: number
}

// ─── App state ───────────────────────────────────────

export interface TournamentState {
  // Tournament config
  tType: TournamentType
  bMethod: BracketMethod
  tournamentName: string
  settings: Settings

  // Data
  teams: Team[]
  groups: Group[]
  rrMatches: Record<string, Match[]>
  bracketMatches: Match[]
  bracketRounds: BracketRound[]
  thirdPlaceMatch: Match | null
  courts: Court[]
  schedule: Record<number, ScheduleEntry>
  history: HistoryEntry[]
  bracketSeedGroups: Record<number, number>

  // Counters (sync'd over WS)
  _tid: number
  _mid: number
  _cid: number

  // WS / session
  wsStatus: WsStatus
  wsStatusText: string
  role: Role
  tournamentId: string | null
  presenceCount: number

  // UI (ephemeral, not broadcast)
  activePage: Page
  curRRGroup: number
  confettiShown: boolean
  toast: { text: string; id: number } | null
  testingMode: boolean
}

export const SKILL_LABELS: Record<number, string> = {
  1: '2.0',
  2: '2.5–3.0',
  3: '3.5',
  4: '4.0',
  5: '4.5+',
}

export const S_CONSTRAINTS: Record<string, { min: number; max: number }> = {
  numGroups: { min: 1, max: 8 },
  groupStageBestOf: { min: 1, max: 5 },
  advanceCount: { min: 1, max: 8 },
  quarterFinalsBestOf: { min: 1, max: 7 },
  sfBestOf: { min: 1, max: 7 },
  finalsBestOf: { min: 1, max: 7 },
  thirdBestOf: { min: 1, max: 7 },
  matchDuration: { min: 5, max: 120 },
}

export const ODD_ONLY = ['groupStageBestOf', 'quarterFinalsBestOf', 'sfBestOf', 'finalsBestOf', 'thirdBestOf']
