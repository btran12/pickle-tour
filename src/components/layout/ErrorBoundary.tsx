import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/**
 * Last-resort guard so a render-time bug shows a recoverable screen instead of
 * a blank page. State stays in memory/localStorage, so reloading is safe.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[app] unhandled error', error, info.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="empty-state" style={{ padding: '48px 20px' }}>
        <div className="ei">⚠️</div>
        <strong>Something went wrong</strong>
        <div style={{ maxWidth: 520, margin: '0 auto 18px', fontSize: 13, color: 'var(--text3)', wordBreak: 'break-word' }}>
          {error.message || 'Unexpected error'}
        </div>
        <div className="flex-row" style={{ gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-primary btn-sm" onClick={() => window.location.reload()}>Reload</button>
          <button className="btn btn-outline btn-sm" onClick={() => { window.location.href = window.location.pathname }}>Go to Home</button>
        </div>
      </div>
    )
  }
}
