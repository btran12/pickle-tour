import type { Settings } from '../../types'
import { useTournament } from '../../context/TournamentContext'

interface NumControlProps {
  settingKey: keyof Settings
  disabled?: boolean
}

export function NumControl({ settingKey, disabled }: NumControlProps) {
  const { state, dispatch } = useTournament()
  const value = state.settings[settingKey] as number

  return (
    <div className="num-control">
      <button disabled={disabled} onClick={() => dispatch({ type: 'ADJ_SETTING', key: settingKey, delta: -1 })}>−</button>
      <span>{value}</span>
      <button disabled={disabled} onClick={() => dispatch({ type: 'ADJ_SETTING', key: settingKey, delta: 1 })}>+</button>
    </div>
  )
}
