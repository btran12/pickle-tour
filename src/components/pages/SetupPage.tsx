import { useTournament } from '../../context/TournamentContext'
import { ToggleGroup } from '../shared/ToggleGroup'
import { NumControl } from '../shared/NumControl'
import type { TournamentType, BracketMethod } from '../../types'

export function SetupPage() {
  const { state, dispatch } = useTournament()
  const { tournamentName, tType, bMethod, settings } = state

  return (
    <div>
      <div className="section-title">Setup</div>
      <div className="section-sub">Configure your tournament</div>

      <div className="grid-2">
        <div>
          <div className="card">
            <div className="card-title">Tournament Name</div>
            <div className="form-row">
              <input
                type="text"
                value={tournamentName}
                onChange={e => dispatch({ type: 'SET_TOURNAMENT_NAME', name: e.target.value })}
                placeholder="e.g. Summer Pickleball Open"
              />
            </div>
            <div className="card-title" style={{ marginTop: 14 }}>Format</div>
            <div className="form-row">
              <label>Player Type</label>
              <ToggleGroup<TournamentType>
                options={[{ value: 'singles', label: 'Singles' }, { value: 'doubles', label: 'Doubles' }]}
                value={tType}
                onChange={v => dispatch({ type: 'SET_TTYPE', value: v })}
              />
            </div>
            <div className="form-row">
              <label>Group Assignment</label>
              <ToggleGroup<BracketMethod>
                options={[{ value: 'skill', label: 'Skill' }, { value: 'random', label: 'Random' }, { value: 'manual', label: 'Manual' }]}
                value={bMethod}
                onChange={v => dispatch({ type: 'SET_BMETHOD', value: v })}
              />
            </div>
          </div>

          <div className="card">
            <div className="card-title">Groups</div>
            <div className="setting-item">
              <div>
                <div className="setting-label">Number of Groups</div>
              </div>
              <NumControl settingKey="numGroups" />
            </div>
            <div className="setting-item">
              <div>
                <div className="setting-label">Teams Advancing per Group</div>
              </div>
              <NumControl settingKey="advanceCount" />
            </div>
          </div>
        </div>

        <div>
          <div className="card">
            <div className="card-title">Scoring</div>
            <div className="setting-item">
              <div>
                <div className="setting-label">Win Score</div>
                <div className="setting-desc">Points needed to win a game</div>
              </div>
              <div className="flex-row" style={{ gap: 8 }}>
                <NumControl settingKey="winScore" />
                <ToggleGroup<string>
                  options={[{ value: 'true', label: 'Win by 2' }, { value: 'false', label: 'Exact' }]}
                  value={settings.winBy2 ? 'true' : 'false'}
                  onChange={v => dispatch({ type: 'SET_SETTING', key: 'winBy2', value: v === 'true' })}
                />
              </div>
            </div>
            <div className="setting-item">
              <div>
                <div className="setting-label">Round Robin Best Of</div>
              </div>
              <NumControl settingKey="rrBestOf" />
            </div>
          </div>

          <div className="card">
            <div className="card-title">Bracket</div>
            <div className="setting-item">
              <div>
                <div className="setting-label">Semifinals Best Of</div>
              </div>
              <NumControl settingKey="sfBestOf" />
            </div>
            <div className="setting-item">
              <div>
                <div className="setting-label">Finals Best Of</div>
              </div>
              <NumControl settingKey="finalsBestOf" />
            </div>
            <div className="setting-item">
              <div>
                <div className="setting-label">3rd Place Best Of</div>
              </div>
              <NumControl settingKey="thirdBestOf" />
            </div>
          </div>

          <div className="card">
            <div className="card-title">Court Schedule</div>
            <div className="setting-item">
              <div>
                <div className="setting-label">Match Duration (min)</div>
              </div>
              <NumControl settingKey="matchDuration" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
