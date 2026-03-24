import type { Settings } from '../../types'
import { useTournament } from '../../context/TournamentContext'

interface NumControlProps {
  settingKey: keyof Settings
}

export function NumControl({ settingKey }: NumControlProps) {
  const { state, dispatch } = useTournament()
  const value = state.settings[settingKey] as number

  return (
    <div className="num-control">
      <button onClick={() => dispatch({ type: 'ADJ_SETTING', key: settingKey, delta: -1 })}>−</button>
      <span>{value}</span>
      <button onClick={() => dispatch({ type: 'ADJ_SETTING', key: settingKey, delta: 1 })}>+</button>
    </div>
  )
}
