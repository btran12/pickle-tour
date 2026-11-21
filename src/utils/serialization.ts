import { DEFAULT_STAGE_SCORING, STAGE_KEYS, defaultScoringByStage } from '../types'
import type {
  TournamentState, WireState, Match, Team, ByeTeam, RosterPlayer,
  SerializedMatch, BracketRound, Settings,
} from '../types'

// ─── Serialize (state → wire) ────────────────────────

export function getSerializableState(state: TournamentState): WireState {
  return {
    tType: state.tType,
    bMethod: state.bMethod,
    tournamentName: state.tournamentName,
    teams: state.teams,
    players: state.players,
    groups: state.groups.map(g => ({ id: g.id, name: g.name, teamIds: g.teams.map(t => t.id) })),
    rrMatches: serializeMatches(state.rrMatches),
    bracketMatches: serializeMatchArray(state.bracketMatches),
    bracketRounds: state.bracketRounds.map(r => ({ title: r.title, matchIds: r.matches.map(m => m.id) })),
    thirdPlaceMatchId: state.thirdPlaceMatch?.id ?? null,
    courts: state.courts,
    schedule: state.schedule,
    history: state.history.slice(-50),
    settings: state.settings,
    bracketSeedGroups: state.bracketSeedGroups,
    _tid: state._tid,
    _mid: state._mid,
    _cid: state._cid,
    _pid: state._pid,
  }
}

function serializeTeamRef(t: Team | ByeTeam | null | undefined): { id: number } | ByeTeam | null {
  if (!t) return null
  if ((t as ByeTeam).isBye) return t as ByeTeam
  return { id: t.id }
}

function serializeMatchArray(matches: Match[]): SerializedMatch[] {
  return matches.map(m => ({
    ...m,
    teamA: serializeTeamRef(m.teamA as Team | ByeTeam | null),
    teamB: serializeTeamRef(m.teamB as Team | ByeTeam | null),
    winner: serializeTeamRef(m.winner as Team | ByeTeam | null),
    loser: serializeTeamRef(m.loser as Team | ByeTeam | null),
  }))
}

export function serializeMatches(rrMatches: Record<string, Match[]>): Record<string, SerializedMatch[]> {
  const out: Record<string, SerializedMatch[]> = {}
  for (const gi in rrMatches) out[gi] = serializeMatchArray(rrMatches[gi])
  return out
}

// ─── Hydrate (wire → state) ─────────────────────────

type LegacySettings = Partial<Settings> & { winScore?: number; winBy2?: boolean }

/**
 * Merge saved settings and migrate the old single winScore/winBy2 pair into
 * per-stage scoring. Old tournaments keep their custom score at every stage.
 */
function normalizeSettings(current: Settings, incoming: LegacySettings | undefined): Settings {
  const base = current.scoringByStage ?? defaultScoringByStage()
  const byStage = { ...base }
  STAGE_KEYS.forEach(stage => {
    byStage[stage] = { ...base[stage] }
  })

  if (incoming?.scoringByStage) {
    STAGE_KEYS.forEach(stage => {
      byStage[stage] = { ...byStage[stage], ...(incoming.scoringByStage?.[stage] ?? {}) }
    })
  } else if (incoming && ('winScore' in incoming || 'winBy2' in incoming)) {
    const winScore = incoming.winScore ?? DEFAULT_STAGE_SCORING.winScore
    const winBy2 = incoming.winBy2 ?? DEFAULT_STAGE_SCORING.winBy2
    STAGE_KEYS.forEach(stage => { byStage[stage] = { winScore, winBy2 } })
  }

  const merged: LegacySettings = { ...current, ...incoming, scoringByStage: byStage }
  delete merged.winScore
  delete merged.winBy2
  return merged as Settings
}

export function hydrateState(current: TournamentState, wire: WireState): TournamentState {
  let pid = wire._pid ?? current._pid ?? 1

  // Normalize teams so every player links back to a roster entry.
  const teams: Team[] = (wire.teams ?? []).map(t => ({
    ...t,
    players: (t.players ?? []).map(p => ({ ...p })),
  }))

  let players: RosterPlayer[] = wire.players ?? []
  if (!players.length && teams.length) {
    // Backwards compatibility: build a roster from teams saved before rosters existed.
    const seen: Record<string, RosterPlayer> = {}
    players = []
    teams.forEach(t => {
      t.players.forEach(p => {
        if (p.playerId) return
        const key = `${p.name.trim().toLowerCase()}|${p.skill}`
        let rp = seen[key]
        if (!rp) {
          rp = { id: pid++, name: p.name, skill: p.skill }
          seen[key] = rp
          players.push(rp)
        }
        p.playerId = rp.id
      })
    })
  } else {
    // Link any unlinked player to an existing roster entry with the same name/skill.
    teams.forEach(t => {
      t.players.forEach(p => {
        if (p.playerId) return
        const match = players.find(rp => rp.name === p.name && rp.skill === p.skill)
        if (match) p.playerId = match.id
      })
    })
  }

  const teamById: Record<number, Team> = {}
  teams.forEach(t => { teamById[t.id] = t })

  function hydrateTeam(ref: { id: number } | ByeTeam | null | undefined): Team | ByeTeam | null {
    if (!ref) return null
    if ((ref as ByeTeam).isBye) return ref as ByeTeam
    return teamById[(ref as { id: number }).id] ?? (ref as Team)
  }

  const groups = (wire.groups ?? []).map(g => ({
    id: g.id, name: g.name,
    teams: (g.teamIds ?? []).map(id => teamById[id]).filter(Boolean) as Team[],
  }))

  const rrMatches: Record<string, Match[]> = {}
  for (const gi in (wire.rrMatches ?? {})) {
    rrMatches[gi] = (wire.rrMatches[gi] ?? []).map(m => ({
      ...m,
      teamA: hydrateTeam(m.teamA),
      teamB: hydrateTeam(m.teamB),
      winner: hydrateTeam(m.winner),
      loser: hydrateTeam(m.loser),
    }))
  }

  const bracketMatches: Match[] = (wire.bracketMatches ?? []).map(m => ({
    ...m,
    teamA: hydrateTeam(m.teamA),
    teamB: hydrateTeam(m.teamB),
    winner: hydrateTeam(m.winner),
    loser: hydrateTeam(m.loser),
  }))

  const matchById: Record<number, Match> = {}
  bracketMatches.forEach(m => { matchById[m.id] = m })

  const bracketRounds: BracketRound[] = (wire.bracketRounds ?? []).map(r => ({
    title: r.title,
    matches: (r.matchIds ?? []).map(id => matchById[id]).filter(Boolean),
  }))

  const thirdPlaceMatch = wire.thirdPlaceMatchId ? (matchById[wire.thirdPlaceMatchId] ?? null) : null

  return {
    ...current,
    tType: wire.tType ?? current.tType,
    bMethod: wire.bMethod ?? current.bMethod,
    tournamentName: wire.tournamentName ?? current.tournamentName,
    teams,
    players,
    groups,
    rrMatches,
    bracketMatches,
    bracketRounds,
    thirdPlaceMatch,
    courts: wire.courts ?? [],
    schedule: wire.schedule ?? {},
    history: wire.history ?? [],
    settings: normalizeSettings(current.settings, wire.settings as LegacySettings | undefined),
    bracketSeedGroups: wire.bracketSeedGroups ?? {},
    _tid: wire._tid ?? current._tid,
    _mid: wire._mid ?? current._mid,
    _cid: wire._cid ?? current._cid,
    _pid: pid,
    // Viewers open spectator on first load
    activePage: current.role === 'viewer' ? current.activePage : current.activePage,
  }
}
