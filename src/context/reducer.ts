import type {
  TournamentState, Team, Match, MatchType, HistoryEntry,
  WireState, TournamentType, BracketMethod, Page, WsStatus, Role, Settings,
} from '../types'
import { S_CONSTRAINTS, ODD_ONLY } from '../types'
import { computeStandings, gameWin } from '../utils/scoring'
import { buildBracket } from '../utils/bracket'
import { hydrateState } from '../utils/serialization'

// ─── Action Types ────────────────────────────────────

export type Action =
  // Nav
  | { type: 'SET_PAGE'; page: Page }
  | { type: 'SET_RR_GROUP'; gi: number }
  // Session
  | { type: 'SET_TOURNAMENT_ID'; id: string }
  | { type: 'SET_ROLE'; role: Role }
  | { type: 'SET_WS_STATUS'; status: WsStatus; text: string }
  | { type: 'SET_PRESENCE'; count: number }
  | { type: 'SET_TOURNAMENT_NAME'; name: string }
  // Setup
  | { type: 'SET_TTYPE'; value: TournamentType }
  | { type: 'SET_BMETHOD'; value: BracketMethod }
  | { type: 'ADJ_SETTING'; key: keyof Settings; delta: number }
  | { type: 'SET_SETTING'; key: keyof Settings; value: number | boolean }
  // Teams
  | { type: 'ADD_TEAM'; team: Team }
  | { type: 'EDIT_TEAM'; team: Team }
  | { type: 'REMOVE_TEAM'; id: number }
  | { type: 'LOAD_SAMPLE_TEAMS' }
  | { type: 'LOAD_SAMPLE_TEAMS_16' }
  | { type: 'LOAD_SAMPLE_TEAMS_32' }
  // Groups
  | { type: 'ASSIGN_GROUPS' }
  | { type: 'MOVE_TEAM'; teamId: number; fromGroupId: number | null; toGroupId: number | null }
  // Courts
  | { type: 'ADD_COURT'; name: string }
  | { type: 'REMOVE_COURT'; id: number }
  | { type: 'AUTO_SCHEDULE'; startTime: string }
  | { type: 'ASSIGN_COURT'; matchId: number; courtId: number; time: string }
  // Round Robin
  | { type: 'START_RR' }
  // Score
  | { type: 'SUBMIT_SCORE'; matchType: MatchType; matchId: number; games: Array<{ scoreA: number; scoreB: number }> }
  // Bracket
  | { type: 'GENERATE_BRACKET' }
  // History
  | { type: 'UNDO_LAST' }
  | { type: 'CLEAR_HISTORY' }
  // Confetti
  | { type: 'SET_CONFETTI_SHOWN' }
  // Toast
  | { type: 'SHOW_TOAST'; text: string }
  | { type: 'CLEAR_TOAST'; id: number }
  // WS sync
  | { type: 'APPLY_REMOTE_STATE'; wireState: WireState }

// ─── Reducer ─────────────────────────────────────────

export function reducer(state: TournamentState, action: Action): TournamentState {
  switch (action.type) {

    // ── Nav ──────────────────────────────────────────
    case 'SET_PAGE':
      return { ...state, activePage: action.page }

    case 'SET_RR_GROUP':
      return { ...state, curRRGroup: action.gi }

    // ── Session ──────────────────────────────────────
    case 'SET_TOURNAMENT_ID':
      return { ...state, tournamentId: action.id }

    case 'SET_ROLE':
      return { ...state, role: action.role }

    case 'SET_WS_STATUS':
      return { ...state, wsStatus: action.status, wsStatusText: action.text }

    case 'SET_PRESENCE':
      return { ...state, presenceCount: action.count }

    case 'SET_TOURNAMENT_NAME':
      return { ...state, tournamentName: action.name }

    // ── Setup ────────────────────────────────────────
    case 'SET_TTYPE':
      return { ...state, tType: action.value }

    case 'SET_BMETHOD':
      return { ...state, bMethod: action.value }

    case 'ADJ_SETTING': {
      const c = S_CONSTRAINTS[action.key as string] ?? { min: 1, max: 99 }
      let v = (state.settings[action.key] as number) + action.delta
      v = Math.max(c.min, Math.min(c.max, v))
      if (ODD_ONLY.includes(action.key as string) && v % 2 === 0) v += action.delta > 0 ? 1 : -1
      v = Math.max(c.min, Math.min(c.max, v))
      return { ...state, settings: { ...state.settings, [action.key]: v } }
    }

    case 'SET_SETTING':
      return { ...state, settings: { ...state.settings, [action.key]: action.value } }

    // ── Teams ────────────────────────────────────────
    case 'ADD_TEAM':
      return { ...state, teams: [...state.teams, action.team], _tid: state._tid + 1 }

    case 'EDIT_TEAM':
      return {
        ...state,
        teams: state.teams.map(t => t.id === action.team.id ? action.team : t),
      }

    case 'REMOVE_TEAM':
      return { ...state, teams: state.teams.filter(t => t.id !== action.id) }

    case 'LOAD_SAMPLE_TEAMS': {
      const samples = [
        { tn: 'The Picklers',    p1: 'Alex Rivera',    s1: 5, p2: 'Sam Torres',     s2: 4 },
        { tn: 'Dink Dynasty',    p1: 'Jordan Lee',     s1: 4, p2: 'Morgan Kim',     s2: 4 },
        { tn: 'Net Dominators',  p1: 'Casey Patel',    s1: 4, p2: 'Riley Chen',     s2: 3 },
        { tn: 'Spin Doctors',    p1: 'Drew Martinez',  s1: 3, p2: 'Quinn Nguyen',   s2: 3 },
        { tn: 'Drop Shot Duo',   p1: 'Avery Johnson',  s1: 3, p2: 'Sage Williams',  s2: 3 },
        { tn: 'Kitchen Kings',   p1: 'Blake Thompson', s1: 2, p2: 'Reese Davis',    s2: 3 },
        { tn: 'Serve & Protect', p1: 'Taylor Brown',   s1: 2, p2: 'Jamie Wilson',   s2: 2 },
        { tn: 'The Bangers',     p1: 'Charlie Moore',  s1: 2, p2: 'Finley Taylor',  s2: 2 },
      ]
      let tid = state._tid
      const newTeams = samples.map(({ tn, p1, s1, p2, s2 }) => {
        const skills = [s1, s2].filter(s => s > 0)
        const avg = skills.reduce((a, b) => a + b, 0) / skills.length
        return { id: tid++, name: tn, players: [{ name: p1, skill: s1 }, { name: p2, skill: s2 }], avgSkill: avg }
      })
      return { ...state, tType: 'doubles', teams: [...state.teams, ...newTeams], _tid: tid }
    }

    case 'LOAD_SAMPLE_TEAMS_16': {
      const samples = [
        { tn: 'The Picklers',      p1: 'Alex Rivera',    s1: 5, p2: 'Sam Torres',     s2: 5 },
        { tn: 'Dink Dynasty',      p1: 'Jordan Lee',     s1: 5, p2: 'Morgan Kim',     s2: 4 },
        { tn: 'Net Dominators',    p1: 'Casey Patel',    s1: 4, p2: 'Riley Chen',     s2: 4 },
        { tn: 'Spin Doctors',      p1: 'Drew Martinez',  s1: 4, p2: 'Quinn Nguyen',   s2: 4 },
        { tn: 'Drop Shot Duo',     p1: 'Avery Johnson',  s1: 4, p2: 'Sage Williams',  s2: 3 },
        { tn: 'Kitchen Kings',     p1: 'Blake Thompson', s1: 3, p2: 'Reese Davis',    s2: 3 },
        { tn: 'Serve & Protect',   p1: 'Taylor Brown',   s1: 3, p2: 'Jamie Wilson',   s2: 3 },
        { tn: 'The Bangers',       p1: 'Charlie Moore',  s1: 3, p2: 'Finley Taylor',  s2: 3 },
        { tn: 'Lob Squad',         p1: 'Dana Scott',     s1: 3, p2: 'Parker Hayes',   s2: 3 },
        { tn: 'Third Kitchen',     p1: 'Robin Ellis',    s1: 3, p2: 'Skylar Brooks',  s2: 2 },
        { tn: 'Poach Masters',     p1: 'Lane Foster',    s1: 2, p2: 'Peyton Reed',    s2: 3 },
        { tn: 'Reset & Rip',       p1: 'Elliot Carr',    s1: 2, p2: 'Harley Stone',   s2: 2 },
        { tn: 'Fault Finders',     p1: 'Addison Hunt',   s1: 2, p2: 'Emery Nash',     s2: 2 },
        { tn: 'Erne Experts',      p1: 'Dallas Cross',   s1: 2, p2: 'Avon Paige',     s2: 2 },
        { tn: 'Backhand Bandits',  p1: 'Kendall Fox',    s1: 2, p2: 'Remy Holt',      s2: 2 },
        { tn: 'Soft Game Gang',    p1: 'Sloane Perry',   s1: 1, p2: 'Winter Cole',    s2: 2 },
      ]
      let tid = state._tid
      const newTeams = samples.map(({ tn, p1, s1, p2, s2 }) => {
        const skills = [s1, s2].filter(s => s > 0)
        const avg = skills.reduce((a, b) => a + b, 0) / skills.length
        return { id: tid++, name: tn, players: [{ name: p1, skill: s1 }, { name: p2, skill: s2 }], avgSkill: avg }
      })
      return { ...state, tType: 'doubles', teams: [...state.teams, ...newTeams], _tid: tid }
    }

    case 'LOAD_SAMPLE_TEAMS_32': {
      const samples = [
        { tn: 'The Picklers',      p1: 'Alex Rivera',    s1: 5, p2: 'Sam Torres',     s2: 5 },
        { tn: 'Dink Dynasty',      p1: 'Jordan Lee',     s1: 5, p2: 'Morgan Kim',     s2: 5 },
        { tn: 'Net Dominators',    p1: 'Casey Patel',    s1: 5, p2: 'Riley Chen',     s2: 4 },
        { tn: 'Spin Doctors',      p1: 'Drew Martinez',  s1: 4, p2: 'Quinn Nguyen',   s2: 4 },
        { tn: 'Drop Shot Duo',     p1: 'Avery Johnson',  s1: 4, p2: 'Sage Williams',  s2: 4 },
        { tn: 'Kitchen Kings',     p1: 'Blake Thompson', s1: 4, p2: 'Reese Davis',    s2: 4 },
        { tn: 'Serve & Protect',   p1: 'Taylor Brown',   s1: 4, p2: 'Jamie Wilson',   s2: 3 },
        { tn: 'The Bangers',       p1: 'Charlie Moore',  s1: 4, p2: 'Finley Taylor',  s2: 3 },
        { tn: 'Lob Squad',         p1: 'Dana Scott',     s1: 3, p2: 'Parker Hayes',   s2: 3 },
        { tn: 'Third Kitchen',     p1: 'Robin Ellis',    s1: 3, p2: 'Skylar Brooks',  s2: 3 },
        { tn: 'Poach Masters',     p1: 'Lane Foster',    s1: 3, p2: 'Peyton Reed',    s2: 3 },
        { tn: 'Reset & Rip',       p1: 'Elliot Carr',    s1: 3, p2: 'Harley Stone',   s2: 3 },
        { tn: 'Fault Finders',     p1: 'Addison Hunt',   s1: 3, p2: 'Emery Nash',     s2: 3 },
        { tn: 'Erne Experts',      p1: 'Dallas Cross',   s1: 3, p2: 'Avon Paige',     s2: 2 },
        { tn: 'Backhand Bandits',  p1: 'Kendall Fox',    s1: 3, p2: 'Remy Holt',      s2: 2 },
        { tn: 'Soft Game Gang',    p1: 'Sloane Perry',   s1: 3, p2: 'Winter Cole',    s2: 2 },
        { tn: 'Cross Court Crew',  p1: 'Baylor Price',   s1: 2, p2: 'Camden Diaz',    s2: 3 },
        { tn: 'No Man\'s Land',    p1: 'Tatum Walsh',    s1: 2, p2: 'Sawyer Flynn',   s2: 2 },
        { tn: 'Flick & Run',       p1: 'Rowan Marsh',    s1: 2, p2: 'Oakley Dunn',    s2: 2 },
        { tn: 'Paddle Pros',       p1: 'Soren Webb',     s1: 2, p2: 'Leighton Gray',  s2: 2 },
        { tn: 'Transition Zone',   p1: 'Marlow Reid',    s1: 2, p2: 'Zephyr Cole',    s2: 2 },
        { tn: 'The Dinksters',     p1: 'Caden Voss',     s1: 2, p2: 'Nolan Pierce',   s2: 2 },
        { tn: 'Court Jesters',     p1: 'Ainsley Knox',   s1: 2, p2: 'Ryder Moss',     s2: 2 },
        { tn: 'Angle Grinders',    p1: 'Emerson Frey',   s1: 2, p2: 'Sterling Hale',  s2: 2 },
        { tn: 'Dink or Swim',      p1: 'Quincy Ash',     s1: 1, p2: 'Wren Daley',     s2: 2 },
        { tn: 'The Side Outs',     p1: 'Hollis Vance',   s1: 1, p2: 'Indie Rowe',     s2: 2 },
        { tn: 'Smash Bros',        p1: 'Beckett Lane',   s1: 1, p2: 'Easton Crow',    s2: 2 },
        { tn: 'Out of Bounds',     p1: 'Harlow Penn',    s1: 1, p2: 'Finch Blair',    s2: 1 },
        { tn: 'Power Drives',      p1: 'Keaton Marsh',   s1: 1, p2: 'Arden Reeves',   s2: 1 },
        { tn: 'Paddle Smashers',   p1: 'Colby Yates',    s1: 1, p2: 'Shiloh Bauer',   s2: 1 },
        { tn: 'Wild Cards',        p1: 'Phoenix Stark',  s1: 1, p2: 'Ember Quinn',    s2: 1 },
        { tn: 'First Timers',      p1: 'River Stone',    s1: 1, p2: 'Willa Dean',     s2: 1 },
      ]
      let tid = state._tid
      const newTeams = samples.map(({ tn, p1, s1, p2, s2 }) => {
        const skills = [s1, s2].filter(s => s > 0)
        const avg = skills.reduce((a, b) => a + b, 0) / skills.length
        return { id: tid++, name: tn, players: [{ name: p1, skill: s1 }, { name: p2, skill: s2 }], avgSkill: avg }
      })
      return { ...state, tType: 'doubles', teams: [...state.teams, ...newTeams], _tid: tid }
    }

    // ── Groups ───────────────────────────────────────
    case 'ASSIGN_GROUPS': {
      const n = state.settings.numGroups
      const groups = Array.from({ length: n }, (_, i) => ({
        id: i, name: 'Group ' + String.fromCharCode(65 + i), teams: [] as Team[],
      }))
      if (state.bMethod === 'skill') {
        const sorted = [...state.teams].sort((a, b) => (b.avgSkill || 0) - (a.avgSkill || 0))
        let dir = 1, gi = 0
        sorted.forEach(t => {
          groups[gi].teams.push(t)
          gi += dir
          if (gi >= n) { gi = n - 1; dir = -1 }
          else if (gi < 0) { gi = 0; dir = 1 }
        })
      } else if (state.bMethod === 'random') {
        [...state.teams].sort(() => Math.random() - 0.5).forEach((t, i) => groups[i % n].teams.push(t))
      } else {
        state.teams.forEach((t, i) => groups[i % n].teams.push(t))
      }
      return { ...state, groups }
    }

    case 'MOVE_TEAM': {
      const groups = state.groups.map(g => ({ ...g, teams: [...g.teams] }))
      if (action.fromGroupId !== null) {
        const src = groups.find(g => g.id === action.fromGroupId)
        if (src) src.teams = src.teams.filter(t => t.id !== action.teamId)
      }
      const team = state.teams.find(t => t.id === action.teamId)
      if (team && action.toGroupId !== null) {
        const dest = groups.find(g => g.id === action.toGroupId)
        if (dest && !dest.teams.find(t => t.id === action.teamId)) dest.teams.push(team)
      }
      return { ...state, groups }
    }

    // ── Courts ───────────────────────────────────────
    case 'ADD_COURT': {
      const court = { id: state._cid, name: action.name }
      return { ...state, courts: [...state.courts, court], _cid: state._cid + 1 }
    }

    case 'REMOVE_COURT': {
      const schedule = { ...state.schedule }
      Object.keys(schedule).forEach(mid => {
        if (schedule[Number(mid)]?.courtId === action.id) delete schedule[Number(mid)]
      })
      return { ...state, courts: state.courts.filter(c => c.id !== action.id), schedule }
    }

    case 'AUTO_SCHEDULE': {
      const matches = allMatchesFlat(state).filter(m => m.status !== 'done')
      const sp = action.startTime.split(':')
      let baseMin = parseInt(sp[0]) * 60 + parseInt(sp[1])
      const dur = state.settings.matchDuration
      const courtSlots: Record<number, number> = {}
      state.courts.forEach(c => { courtSlots[c.id] = 0 })
      const schedule = { ...state.schedule }
      matches.forEach((m, i) => {
        const court = state.courts[i % state.courts.length]
        const slot = courtSlots[court.id]
        const t = baseMin + slot * dur
        const h = Math.floor((t / 60) % 24).toString().padStart(2, '0')
        const mn = (t % 60).toString().padStart(2, '0')
        schedule[m.id] = { courtId: court.id, time: `${h}:${mn}` }
        courtSlots[court.id]++
      })
      return { ...state, schedule }
    }

    case 'ASSIGN_COURT': {
      return {
        ...state,
        schedule: { ...state.schedule, [action.matchId]: { courtId: action.courtId, time: action.time } },
      }
    }

    // ── Round Robin ──────────────────────────────────
    case 'START_RR': {
      const rrMatches: Record<string, Match[]> = {}
      let mid = state._mid
      state.groups.forEach((g, gi) => {
        const ms: Match[] = []
        for (let a = 0; a < g.teams.length; a++) {
          for (let b = a + 1; b < g.teams.length; b++) {
            ms.push({ id: mid++, teamA: g.teams[a], teamB: g.teams[b], games: [], winner: null, status: 'pending' })
          }
        }
        rrMatches[gi] = ms
      })
      return { ...state, rrMatches, _mid: mid, activePage: 'roundrobin' }
    }

    // ── Score ────────────────────────────────────────
    case 'SUBMIT_SCORE': {
      const { matchType, matchId, games } = action
      const wn = Math.ceil(
        (matchType === 'rr'
          ? state.settings.rrBestOf
          : (findMatch(state, matchType, matchId)?.bestOf ?? state.settings.sfBestOf)
        ) / 2
      )
      let wA = 0, wB = 0
      const trimmed: typeof games = []
      for (const g of games) {
        const w = gameWin(g.scoreA, g.scoreB, state.settings.winScore, state.settings.winBy2)
        if (w === 0) wA++; if (w === 1) wB++
        trimmed.push(g)
        if (wA >= wn || wB >= wn) break
      }

      const applyToMatch = (m: Match): Match => {
        if (m.id !== matchId) return m
        const snapshot = JSON.stringify({ games: m.games, winner: m.winner ? { id: (m.winner as Team).id } : null, status: m.status })
        let winner = m.winner, loser = m.loser, status = m.status
        if (wA >= wn) { winner = m.teamA; loser = m.teamB; status = 'done' }
        else if (wB >= wn) { winner = m.teamB; loser = m.teamA; status = 'done' }
        else { winner = null; loser = null; status = trimmed.length > 0 ? 'live' : 'pending' }
        const desc = status === 'done'
          ? `${(winner as Team).name} def. ${(winner as Team).id === (m.teamA as Team)?.id ? (m.teamB as Team)?.name : (m.teamA as Team)?.name} (${trimmed.map(g => g.scoreA + '-' + g.scoreB).join(', ')})`
          : `Score updated: ${(m.teamA as Team)?.name} vs ${(m.teamB as Team)?.name}`
        const entry: HistoryEntry = { ts: Date.now(), desc, ctx: { type: matchType, matchId, snapshot } }
        return { ...m, games: trimmed, winner, loser, status, _historyEntry: entry } as Match & { _historyEntry: HistoryEntry }
      }

      if (matchType === 'rr') {
        const newRR: Record<string, Match[]> = {}
        for (const gi in state.rrMatches) newRR[gi] = state.rrMatches[gi].map(applyToMatch)
        const updated = Object.values(newRR).flat().find(m => m.id === matchId)
        const entry = (updated as Match & { _historyEntry?: HistoryEntry })?._historyEntry
        // clean up internal marker
        for (const gi in newRR) newRR[gi] = newRR[gi].map(m => { const { _historyEntry: _, ...rest } = m as Match & { _historyEntry?: HistoryEntry }; return rest })
        return { ...state, rrMatches: newRR, history: entry ? [...state.history, entry] : state.history }
      } else {
        // Bracket: apply score then advance winner
        let bracketMatches = state.bracketMatches.map(applyToMatch)
        let thirdPlaceMatch = state.thirdPlaceMatch
        const scored = bracketMatches.find(m => m.id === matchId)
        const entry = (scored as Match & { _historyEntry?: HistoryEntry })?._historyEntry
        bracketMatches = bracketMatches.map(m => { const { _historyEntry: _, ...rest } = m as Match & { _historyEntry?: HistoryEntry }; return rest })
        if (thirdPlaceMatch?.id === matchId) {
          thirdPlaceMatch = applyToMatch(thirdPlaceMatch)
          const { _historyEntry: _, ...rest } = thirdPlaceMatch as Match & { _historyEntry?: HistoryEntry }
          thirdPlaceMatch = rest
        }
        // Advance winner
        if (scored?.winner) {
          const loser = (scored.winner as Team).id === (scored.teamA as Team)?.id ? scored.teamB : scored.teamA
          bracketMatches = bracketMatches.map(m => {
            if (!m.feedFrom) return m
            const nm = { ...m }
            if (m.feedFrom[0] === matchId && !nm.teamA) nm.teamA = scored.winner
            else if (m.feedFrom[1] === matchId && !nm.teamB) nm.teamB = scored.winner
            return nm
          })
          if (thirdPlaceMatch?.feedLoserFrom && loser && !(loser as { isBye?: boolean }).isBye) {
            const tp = { ...thirdPlaceMatch }
            if (tp.feedLoserFrom![0] === matchId && !tp.teamA) tp.teamA = loser
            else if (tp.feedLoserFrom![1] === matchId && !tp.teamB) tp.teamB = loser
            thirdPlaceMatch = tp
            // Keep bracketMatches in sync so serialization preserves the updated teams
            bracketMatches = bracketMatches.map(m => m.id === tp.id ? tp : m)
          }
        }
        return { ...state, bracketMatches, thirdPlaceMatch, history: entry ? [...state.history, entry] : state.history }
      }
    }

    // ── Bracket ──────────────────────────────────────
    case 'GENERATE_BRACKET': {
      let seeds: (Team | null)[] = []
      const seedGroups: Record<number, number> = {}
      state.groups.forEach((g, gi) => {
        const st = computeStandings(gi, state)
        st.slice(0, state.settings.advanceCount).forEach(s => {
          seedGroups[s.team.id] = gi
          seeds.push(s.team)
        })
      })
      if (seeds.length < 2) return state
      while (!isPow2(seeds.length)) seeds.push(null)
      const { bracketMatches, bracketRounds, thirdPlaceMatch, _mid } = buildBracket(seeds, state._mid, state.settings)
      return {
        ...state, bracketMatches, bracketRounds, thirdPlaceMatch, bracketSeedGroups: seedGroups,
        _mid, activePage: 'bracket', confettiShown: false,
      }
    }

    // ── History ──────────────────────────────────────
    case 'UNDO_LAST': {
      if (!state.history.length) return state
      const history = [...state.history]
      const last = history.pop()!
      const { type, matchId, snapshot } = last.ctx
      const prev = JSON.parse(snapshot) as { games: Match['games']; winner: { id: number } | null; status: Match['status'] }

      const restoreMatch = (m: Match): Match => {
        if (m.id !== matchId) return m
        const winner = prev.winner
          ? ((m.teamA as Team)?.id === prev.winner.id ? m.teamA : m.teamB)
          : null
        return { ...m, games: prev.games, status: prev.status, winner }
      }

      if (type === 'rr') {
        const newRR: Record<string, Match[]> = {}
        for (const gi in state.rrMatches) newRR[gi] = state.rrMatches[gi].map(restoreMatch)
        return { ...state, rrMatches: newRR, history }
      } else {
        let bracketMatches = state.bracketMatches.map(restoreMatch)
        // Clear downstream slots fed from undone match
        bracketMatches = bracketMatches.map(m => {
          if (!m.feedFrom) return m
          const nm = { ...m }
          if (m.feedFrom[0] === matchId) nm.teamA = null
          if (m.feedFrom[1] === matchId) nm.teamB = null
          return nm
        })
        let thirdPlaceMatch = state.thirdPlaceMatch?.id === matchId
          ? restoreMatch(state.thirdPlaceMatch!)
          : state.thirdPlaceMatch
        return { ...state, bracketMatches, thirdPlaceMatch, history }
      }
    }

    case 'CLEAR_HISTORY':
      return { ...state, history: [] }

    // ── Confetti ─────────────────────────────────────
    case 'SET_CONFETTI_SHOWN':
      return { ...state, confettiShown: true }

    // ── Toast ────────────────────────────────────────
    case 'SHOW_TOAST':
      return { ...state, toast: { text: action.text, id: Date.now() } }

    case 'CLEAR_TOAST':
      return state.toast?.id === action.id ? { ...state, toast: null } : state

    // ── WS sync ──────────────────────────────────────
    case 'APPLY_REMOTE_STATE':
      return hydrateState(state, action.wireState)

    default:
      return state
  }
}

// ─── Helpers ─────────────────────────────────────────

function isPow2(n: number): boolean {
  return n > 0 && (n & (n - 1)) === 0
}

function findMatch(state: TournamentState, type: MatchType, id: number): Match | undefined {
  if (type === 'rr') {
    for (const gi in state.rrMatches) {
      const m = state.rrMatches[gi].find(m => m.id === id)
      if (m) return m
    }
    return undefined
  }
  return state.bracketMatches.find(m => m.id === id) ?? (state.thirdPlaceMatch?.id === id ? state.thirdPlaceMatch : undefined)
}

export function allMatchesFlat(state: TournamentState): Match[] {
  const arr: Match[] = []
  for (const gi in state.rrMatches) arr.push(...state.rrMatches[gi])
  arr.push(...state.bracketMatches.filter(m => !(m.teamA as { isBye?: boolean })?.isBye && !(m.teamB as { isBye?: boolean })?.isBye))
  return arr
}
