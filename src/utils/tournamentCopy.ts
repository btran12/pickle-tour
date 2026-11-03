import type { TournamentState } from '../types'
import { initialState } from '../context/initialState'

/**
 * Builds a fresh tournament from an existing one, carrying over the reusable
 * setup (roster, teams, courts, format and settings) while clearing all
 * tournament progress (groups, schedule, matches, bracket and history).
 */
export function copyTournamentState(source: TournamentState, newId: string): TournamentState {
  const maxTeamId = source.teams.reduce((max, t) => Math.max(max, t.id), 0)
  const maxCourtId = source.courts.reduce((max, c) => Math.max(max, c.id), 0)
  const maxPlayerId = source.players.reduce((max, p) => Math.max(max, p.id), 0)
  const isOffline = newId.startsWith('local_')

  return {
    ...initialState,
    tournamentId: newId,
    role: 'admin',
    tournamentName: copiedName(source.tournamentName),
    tType: source.tType,
    bMethod: source.bMethod,
    settings: { ...source.settings },
    players: source.players.map(p => ({ ...p })),
    teams: source.teams.map(t => ({
      ...t,
      players: t.players.map(p => ({ ...p })),
    })),
    courts: source.courts.map(c => ({ ...c })),
    _tid: Math.max(source._tid, maxTeamId + 1),
    _mid: 1,
    _cid: Math.max(source._cid, maxCourtId + 1),
    _pid: Math.max(source._pid, maxPlayerId + 1),
    wsStatus: isOffline ? 'offline' : 'connecting',
    wsStatusText: isOffline ? '' : '⟳ Creating copy…',
    activePage: 'setup',
  }
}

/** "Summer Open" → "Summer Open (Copy)", "Summer Open (Copy)" → "Summer Open (Copy 2)". */
export function copiedName(name: string): string {
  const trimmed = (name || 'Tournament').trim() || 'Tournament'
  const match = trimmed.match(/^(.*?)\s*\(Copy(?: (\d+))?\)$/i)
  if (!match) return `${trimmed} (Copy)`
  const base = match[1].trim() || 'Tournament'
  const next = match[2] ? Number(match[2]) + 1 : 2
  return `${base} (Copy ${next})`
}
