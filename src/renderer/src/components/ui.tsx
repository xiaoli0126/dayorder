import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../lib/cn'

type ButtonVariant = 'primary' | 'soft' | 'ghost' | 'outline' | 'danger'

const BUTTON_STYLES: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--accent)] text-white hover:brightness-105 active:brightness-95 shadow-[var(--shadow-1)]',
  soft: 'bg-surface-2 text-ink hover:bg-line',
  ghost: 'text-ink-2 hover:bg-surface-2 hover:text-ink',
  outline: 'border border-line text-ink-2 hover:border-line-strong hover:text-ink bg-surface',
  danger: 'bg-[color-mix(in_oklab,var(--danger)_12%,transparent)] text-danger hover:bg-[color-mix(in_oklab,var(--danger)_18%,transparent)]'
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: 'sm' | 'md'
}

export function Button({ variant = 'soft', size = 'md', className, ...props }: ButtonProps): React.JSX.Element {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'h-7 px-2.5 text-[12.5px]' : 'h-9 px-3.5 text-[13px]',
        BUTTON_STYLES[variant],
        className
      )}
      {...props}
    />
  )
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  active?: boolean
}

export function IconButton({ label, active, className, children, ...props }: IconButtonProps): React.JSX.Element {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      data-active={active}
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink',
        'data-[active=true]:bg-[color-mix(in_oklab,var(--accent)_14%,transparent)] data-[active=true]:text-[var(--accent)]',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }): React.JSX.Element {
  return (
    <div className="mb-2 flex h-6 items-center justify-between px-1">
      <span className="text-[11px] font-medium uppercase tracking-wide text-ink-3">{children}</span>
      {action}
    </div>
  )
}

export function ProgressRing({
  value,
  size = 40,
  stroke = 4,
  label
}: {
  value: number
  size?: number
  stroke?: number
  label?: string
}): React.JSX.Element {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(1, value))
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--line)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
          style={{ transition: 'stroke-dashoffset 220ms var(--ease)' }}
        />
      </svg>
      <span className="absolute text-[10px] font-medium tabular-nums text-ink-2">{label ?? `${Math.round(clamped * 100)}%`}</span>
    </div>
  )
}

export function Switch({
  checked,
  onChange,
  label
}: {
  checked: boolean
  onChange: (value: boolean) => void
  label: string
}): React.JSX.Element {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors',
        checked ? 'bg-[var(--accent)]' : 'bg-line-strong'
      )}
      style={{ background: checked ? 'var(--accent)' : 'var(--line-strong)' }}
    >
      <span
        className="absolute top-[3px] h-4 w-4 rounded-full bg-white shadow transition-[left] duration-150"
        style={{ left: checked ? 19 : 3 }}
      />
    </button>
  )
}

interface ModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  width?: number
}

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  width = 520
}: ModalProps): React.JSX.Element {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px]" />
        <DialogPrimitive.Content
          className="dialog-card fixed left-1/2 top-1/2 z-50 max-h-[86vh] w-[calc(100vw-48px)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow-2)] outline-none"
          style={{ maxWidth: width }}
        >
          <div className="flex items-start justify-between gap-4 px-5 pb-2 pt-5">
            <div className="min-w-0">
              <DialogPrimitive.Title className="text-[16px] font-semibold text-ink">{title}</DialogPrimitive.Title>
              {description ? (
                <DialogPrimitive.Description className="mt-1 text-[12.5px] leading-5 text-ink-2">
                  {description}
                </DialogPrimitive.Description>
              ) : null}
            </div>
            <DialogPrimitive.Close asChild>
              <IconButton label="关闭">
                <X size={16} />
              </IconButton>
            </DialogPrimitive.Close>
          </div>
          <div className="max-h-[62vh] overflow-y-auto px-5 py-3">{children}</div>
          {footer ? <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-3">{footer}</div> : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
