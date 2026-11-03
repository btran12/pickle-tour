import { useTournament } from '../../context/TournamentContext'
import { useConfirm } from '../../context/ConfirmContext'
import { ToggleGroup } from '../shared/ToggleGroup'
import { NumControl } from '../shared/NumControl'
import type { TournamentType, BracketMethod } from '../../types'

export function SetupPage() {
  const { state, dispatch } = useTournament()
  const confirm = useConfirm()
  const { tournamentName, tType, bMethod, settings, teams, players } = state
  const groupsLocked = Object.keys(state.rrMatches).length > 0 || state.bracketRounds.length > 0

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
                disabled={groupsLocked}
                onChange={async v => {
                  if (v === 'singles' && teams.some(t => t.players.length > 1) && players.length) {
                    if (!await confirm({
                      title: 'Switch to Singles',
                      message: 'Switch to singles? Teams will be rebuilt so every player is their own team.',
                      confirmLabel: 'Switch',
                    })) return
                  }
                  dispatch({ type: 'SET_TTYPE', value: v })
                }}
              />
              {groupsLocked && <div className="setting-desc">Locked — the tournament has already started</div>}
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
                {groupsLocked && <div className="setting-desc">Locked — round robin has already started</div>}
              </div>
              <NumControl settingKey="numGroups" disabled={groupsLocked} />
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
                <div className="setting-label">Group Stage Best Of</div>
              </div>
              <NumControl settingKey="groupStageBestOf" />
            </div>
          </div>

          <div className="card">
            <div className="card-title">Bracket</div>
            <div className="setting-item">
              <div>
                <div className="setting-label">Quarter Finals Best Of</div>
              </div>
              <NumControl settingKey="quarterFinalsBestOf" />
            </div>
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

      <div className="setup-footer no-print">
        <div style={{ minWidth: 0 }}>
          <div className="setting-label">Next: {players.length ? `your ${players.length} player${players.length === 1 ? '' : 's'}` : 'add your players'}</div>
          <div className="setting-desc">
            {players.length
              ? 'Review the roster, then build or randomize teams.'
              : 'Register players on the Players page — in singles each player becomes their own team.'}
          </div>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => dispatch({ type: 'SET_PAGE', page: 'players' })}
        >
          Continue to Players →
        </button>
      </div>
    </div>
  )
}
