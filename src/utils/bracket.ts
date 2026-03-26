import type { Match, Team, BracketRound, Settings } from '../types'

export function buildBracket(
  seeds: (Team | null)[],
  midStart: number,
  settings: Settings,
): { bracketMatches: Match[]; bracketRounds: BracketRound[]; thirdPlaceMatch: Match | null; _mid: number } {
  const bracketMatches: Match[] = []
  const bracketRounds: BracketRound[] = []
  let thirdPlaceMatch: Match | null = null
  let mid = midStart

  const n = seeds.length
  const total = Math.log2(n)

  const getBO = (ri: number): number => {
    if (ri === total - 1) return settings.finalsBestOf
    if (ri === total - 2) return settings.sfBestOf
    if (total >= 4 && ri === total - 3) return settings.quarterFinalsBestOf
    return settings.groupStageBestOf
  }

  const pairs: [(Team | null), (Team | null)][] = []
  for (let i = 0; i < n / 2; i++) pairs.push([seeds[i], seeds[n - 1 - i]])

  let cur: Match[] = pairs.map(([a, b]) => {
    const m: Match = {
      id: mid++,
      teamA: a ?? { id: -mid, name: 'BYE', isBye: true },
      teamB: b ?? { id: -mid - 1, name: 'BYE', isBye: true },
      games: [], winner: null, loser: null, status: 'pending', bestOf: getBO(0), roundIdx: 0,
    }
    if (!a) { m.winner = b; m.loser = a as null; m.status = 'done' }
    if (!b) { m.winner = a; m.loser = b as null; m.status = 'done' }
    bracketMatches.push(m)
    return m
  })

  bracketRounds.push({ title: rndTitle(0, total, cur.length), matches: cur })

  let ri = 1
  while (cur.length > 1) {
    const next: Match[] = []
    for (let i = 0; i < cur.length; i += 2) {
      const m: Match = {
        id: mid++, teamA: null, teamB: null, games: [], winner: null, loser: null,
        status: 'pending', bestOf: getBO(ri), roundIdx: ri,
        feedFrom: [cur[i].id, cur[i + 1]?.id],
      }
      if (cur[i].status === 'done') m.teamA = cur[i].winner
      if (cur[i + 1]?.status === 'done') m.teamB = cur[i + 1].winner
      if ((m.teamA as { isBye?: boolean })?.isBye || (m.teamB as { isBye?: boolean })?.isBye) {
        m.winner = (m.teamA as { isBye?: boolean })?.isBye ? m.teamB : m.teamA
        m.loser = (m.teamA as { isBye?: boolean })?.isBye ? m.teamA : m.teamB
        m.status = 'done'
      }
      bracketMatches.push(m)
      next.push(m)
    }
    bracketRounds.push({ title: rndTitle(ri, total, next.length), matches: next })
    cur = next
    ri++
  }

  // 3rd place match
  if (total >= 2) {
    const sfRound = bracketRounds[bracketRounds.length - 2]
    if (sfRound && sfRound.matches.length >= 2) {
      const sf1 = sfRound.matches[0]
      const sf2 = sfRound.matches[1]
      thirdPlaceMatch = {
        id: mid++,
        teamA: sf1.status === 'done' && !(sf1.loser as { isBye?: boolean })?.isBye ? (sf1.loser ?? null) : null,
        teamB: sf2.status === 'done' && !(sf2.loser as { isBye?: boolean })?.isBye ? (sf2.loser ?? null) : null,
        games: [], winner: null, loser: null, status: 'pending',
        bestOf: settings.thirdBestOf ?? 3, roundIdx: -1, is3rdPlace: true,
        feedLoserFrom: [sf1.id, sf2.id],
      }
      bracketMatches.push(thirdPlaceMatch)
    }
  }

  return { bracketMatches, bracketRounds, thirdPlaceMatch, _mid: mid }
}

export function rndTitle(i: number, t: number, matchCount?: number): string {
  if (i === t - 1) return '🏆 Final'
  if (i === t - 2) return '🥈 Semi-Finals'
  if (t >= 4 && i === t - 3) return 'Quarter-Finals'
  // For early rounds, show "Round of X" based on number of matches
  if (matchCount === 16) return 'Round of 16'
  if (matchCount === 8) return 'Round of 8'
  return `Round ${i + 1}`
}
