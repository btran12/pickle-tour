import { useTournament } from '../../context/TournamentContext'
import { useModal } from '../../context/ModalContext'
import { SKILL_LABELS } from '../../types'

export function TeamsPage() {
  const { state, dispatch } = useTournament()
  const { openAddTeam, openEditTeam } = useModal()
  const { teams, tType } = state

  return (
    <div>
      <div className="section-title">Teams</div>
      <div className="section-sub">
        {tType === 'doubles' ? 'Adding doubles teams (2 players)' : 'Adding singles players'}
      </div>

      <div className="flex-row flex-between mb12 no-print">
        <div className="flex-row" style={{ gap: 7 }}>
          <button className="btn btn-primary btn-sm" onClick={openAddTeam}>+ Add Team</button>
          <button className="btn btn-outline btn-sm" onClick={() => {
            if (!teams.length || confirm('This will add 8 sample doubles teams. Continue?')) {
              dispatch({ type: 'LOAD_SAMPLE_TEAMS' })
            }
          }}>Sample 8</button>
          <button className="btn btn-outline btn-sm" onClick={() => {
            if (!teams.length || confirm('This will add 16 sample doubles teams. Continue?')) {
              dispatch({ type: 'LOAD_SAMPLE_TEAMS_16' })
            }
          }}>Sample 16</button>
          <button className="btn btn-outline btn-sm" onClick={() => {
            if (!teams.length || confirm('This will add 32 sample doubles teams. Continue?')) {
              dispatch({ type: 'LOAD_SAMPLE_TEAMS_32' })
            }
          }}>Sample 32</button>
        </div>
        {teams.length >= 2 && (
          <button className="btn btn-outline btn-sm" onClick={() => {
            dispatch({ type: 'ASSIGN_GROUPS' })
            dispatch({ type: 'SET_PAGE', page: 'groups' })
          }}>Go to Groups →</button>
        )}
      </div>

      <div id="teamsList">
        {teams.length === 0 ? (
          <div className="empty-state">
            <div className="ei">🎾</div>
            <strong>No teams yet</strong>
            Click Add Team
          </div>
        ) : (
          teams.map(t => {
            const skillRound = Math.round(t.avgSkill)
            const meta = tType === 'doubles'
              ? t.players.map(p => p.name + (p.skill ? ` (${SKILL_LABELS[p.skill]})` : '')).join(' & ')
              : ''
            return (
              <div key={t.id} className="team-item">
                <div>
                  <div className="team-name">
                    {t.name}
                    {t.avgSkill > 0 && (
                      <span className={`skill-badge skill-${skillRound}`}>{SKILL_LABELS[skillRound] ?? '?'}</span>
                    )}
                  </div>
                  {meta && <div className="team-meta">{meta}</div>}
                </div>
                <div style={{ display: 'flex', gap: 5 }}>
                  <button className="btn btn-outline btn-sm no-print" onClick={() => openEditTeam(t.id)} title="Edit">✏</button>
                  <button className="btn btn-danger btn-sm no-print" onClick={() => dispatch({ type: 'REMOVE_TEAM', id: t.id })}>✕</button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
