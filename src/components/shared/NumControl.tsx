import type { Settings, StageKey } from '../../types'
import { DEFAULT_STAGE_SCORING } from '../../types'
import { useTournament } from '../../context/TournamentContext'

interface NumControlProps {
  settingKey?: keyof Settings
  /** When set, adjusts the win score for this stage instead of a global setting. */
  stage?: StageKey
  disabled?: boolean
}

export function NumControl({ settingKey, stage, disabled }: NumControlProps) {
  const { state, dispatch } = useTournament()
  const value = stage
    ? (state.settings.scoringByStage?.[stage] ?? DEFAULT_STAGE_SCORING).winScore
    : state.settings[settingKey as keyof Settings] as number

  const adjust = (delta: number) => {
    if (stage) {
      dispatch({ type: 'ADJ_STAGE_SETTING', stage, key: 'winScore', delta })
    } else {
      dispatch({ type: 'ADJ_SETTING', key: settingKey as keyof Settings, delta })
    }
  }

  return (
    <div className="num-control">
      <button disabled={disabled} onClick={() => adjust(-1)}>−</button>
      <span>{value}</span>
      <button disabled={disabled} onClick={() => adjust(1)}>+</button>
    </div>
  )
}
