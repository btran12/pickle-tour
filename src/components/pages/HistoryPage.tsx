import { useTournament } from '../../context/TournamentContext'
import { useConfirm } from '../../context/ConfirmContext'
import { fmtTs } from '../../utils/scoring'

export function HistoryPage() {
  const { state, dispatch } = useTournament()
  const confirm = useConfirm()
  const { history } = state

  return (
    <div>
      <div className="section-title">History</div>

      <div className="flex-row flex-between mb12 no-print">
        <button
          className="btn btn-outline btn-sm"
          disabled={history.length === 0}
          onClick={() => dispatch({ type: 'UNDO_LAST' })}
        >
          ↩ Undo Last
        </button>
        <button
          className="btn btn-danger btn-sm"
          disabled={history.length === 0}
          onClick={async () => {
            if (await confirm({ title: 'Clear History', message: 'Clear all history?', confirmLabel: 'Clear', danger: true })) {
              dispatch({ type: 'CLEAR_HISTORY' })
            }
          }}
        >
          Clear History
        </button>
      </div>

      {history.length === 0 ? (
        <div className="empty-state" style={{ padding: '18px 0' }}>
          <strong>No score history yet</strong>
        </div>
      ) : (
        <div>
          {[...history].reverse().map((h, i) => (
            <div key={h.ts + i} className="history-entry">
              <div className="history-time">{fmtTs(h.ts)}</div>
              <div className="history-text"><strong>{h.desc}</strong></div>
              {i === 0 && (
                <button className="btn btn-danger btn-sm no-print" onClick={() => dispatch({ type: 'UNDO_LAST' })}>↩</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
