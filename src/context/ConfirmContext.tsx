import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

export interface ConfirmOptions {
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  hideCancel?: boolean
}

type ConfirmFn = (options: ConfirmOptions | string) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn | null>(null)

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm must be used inside ConfirmProvider')
  return ctx
}

interface PendingConfirm extends ConfirmOptions {
  resolve: (value: boolean) => void
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null)

  const confirm = useCallback<ConfirmFn>((options) => {
    const opts = typeof options === 'string' ? { message: options } : options
    return new Promise<boolean>(resolve => {
      setPending({ ...opts, resolve })
    })
  }, [])

  const settle = useCallback((value: boolean) => {
    if (!pending) return
    pending.resolve(value)
    setPending(null)
  }, [pending])

  useEffect(() => {
    if (!pending) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') settle(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pending, settle])

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending && (
        <div
          className="modal-overlay open"
          onClick={e => { if (e.target === e.currentTarget) settle(false) }}
        >
          <div className="modal" role="alertdialog" aria-modal="true" aria-label={pending.title ?? 'Confirm'}>
            <div className="modal-title">{pending.title ?? 'CONFIRM'}</div>
            <div style={{ whiteSpace: 'pre-line', fontSize: 14, lineHeight: 1.6, color: 'var(--text2)', marginBottom: 18 }}>
              {pending.message}
            </div>
            <div className="modal-actions">
              {!pending.hideCancel && (
                <button className="btn btn-outline" onClick={() => settle(false)}>
                  {pending.cancelLabel ?? 'Cancel'}
                </button>
              )}
              <button
                className={`btn ${pending.danger ? 'btn-danger' : 'btn-primary'}`}
                autoFocus
                onClick={() => settle(true)}
              >
                {pending.confirmLabel ?? 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}
