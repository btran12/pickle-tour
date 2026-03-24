import type { TournamentState } from '../types'
import type { Team } from '../types'
import { computeStandings, gamesWon } from './scoring'

export function exportCSV(state: TournamentState): void {
  const tn = state.tournamentName || 'Tournament'
  const rows: (string | number)[][] = [
    ['PickleBracket Export — ' + tn], [''],
    ['ROUND ROBIN RESULTS'],
    ['Group', 'Match #', 'Team A', 'Team B', 'Games', 'Winner'],
  ]

  for (const gi in state.rrMatches) {
    state.rrMatches[gi].forEach((m, i) => {
      rows.push([
        state.groups[Number(gi)]?.name ?? '',
        i + 1,
        (m.teamA as Team)?.name ?? '',
        (m.teamB as Team)?.name ?? '',
        m.games.map(g => `${g.scoreA}-${g.scoreB}`).join(' | '),
        (m.winner as Team)?.name ?? '',
      ])
    })
  }

  rows.push([], ['STANDINGS'])
  state.groups.forEach((g, gi) => {
    rows.push([g.name], ['Rank', 'Team', 'Wins', 'Losses', 'Pt Diff'])
    computeStandings(gi, state).forEach((s, i) => {
      rows.push([i + 1, s.team.name, s.wins, s.losses, s.pd])
    })
    rows.push([])
  })

  if (state.bracketMatches.length) {
    rows.push(['BRACKET'], ['Round', 'Team A', 'Team B', 'Games Won A', 'Games Won B', 'Winner'])
    state.bracketRounds.forEach(r => {
      r.matches.forEach(m => {
        if ((m.teamA as { isBye?: boolean })?.isBye || (m.teamB as { isBye?: boolean })?.isBye) return
        rows.push([
          r.title,
          (m.teamA as Team)?.name ?? '',
          (m.teamB as Team)?.name ?? '',
          gamesWon(m, 'A', state.settings.winScore, state.settings.winBy2),
          gamesWon(m, 'B', state.settings.winScore, state.settings.winBy2),
          (m.winner as Team)?.name ?? '',
        ])
      })
    })
  }

  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  a.download = `${tn.replace(/\s+/g, '_')}_results.csv`
  a.click()
}
