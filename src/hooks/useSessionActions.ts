import { useState } from 'react'
import { useTournament } from '../context/TournamentContext'
import { useConfirm } from '../context/ConfirmContext'

/**
 * Shared session actions used by the settings modal and the bottom bar:
 * leaving the current tournament (with an offline-specific warning) and
 * duplicating it into a fresh tournament.
 */
export function useSessionActions() {
  const { state, duplicateTournament, goHome } = useTournament()
  const confirm = useConfirm()
  const [copying, setCopying] = useState(false)
  const tournamentId = state.tournamentId

  const leaveSession = async () => {
    if (tournamentId?.startsWith('local_')) {
      const ok = await confirm({
        title: 'Leave Offline Tournament',
        message: 'This offline tournament is saved on this device. Go home? You can reopen it from the tournament list.',
        confirmLabel: 'Go Home',
      })
      if (!ok) return
    }
    goHome()
  }

  const copySession = async () => {
    if (!tournamentId) return
    const ok = await confirm({
      title: 'Copy Tournament',
      message: 'Create a new tournament with the same players, teams, courts, and settings?\n\nGroups, schedule, matches, and bracket will start fresh. The current tournament is left unchanged.',
      confirmLabel: 'Create Copy',
    })
    if (!ok) return
    setCopying(true)
    await duplicateTournament(tournamentId)
    setCopying(false)
  }

  return { leaveSession, copySession, copying }
}
