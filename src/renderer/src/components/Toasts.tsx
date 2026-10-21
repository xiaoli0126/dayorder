import { useApp } from '../store/useApp'

export function Toasts(): React.JSX.Element {
  const toasts = useApp((state) => state.toasts)
  const dismiss = useApp((state) => state.dismissToast)

  return (
    <div className="pointer-events-none fixed bottom-5 left-1/2 z-[60] flex w-[min(520px,calc(100vw-40px))] -translate-x-1/2 flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="toast pointer-events-auto flex items-center gap-3 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[13px] text-ink shadow-[var(--shadow-2)]"
          role="status"
        >
          <span className="min-w-0 flex-1">{toast.message}</span>
          {toast.actionLabel && toast.action ? (
            <button
              type="button"
              className="shrink-0 rounded-md px-2 py-1 text-[12.5px] font-medium text-[var(--accent)] hover:bg-surface-2"
              onClick={() => {
                toast.action?.()
                dismiss(toast.id)
              }}
            >
              {toast.actionLabel}
            </button>
          ) : null}
          <button
            type="button"
            aria-label="关闭提示"
            className="shrink-0 rounded-md px-1.5 py-1 text-ink-3 hover:bg-surface-2 hover:text-ink"
            onClick={() => dismiss(toast.id)}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
