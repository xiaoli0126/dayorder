import { Moon, Sun } from 'lucide-react'
import { formatClock } from '@shared/time'
import { useApp } from '../store/useApp'
import { IconButton } from './ui'

export function TitleBar(): React.JSX.Element {
  const doc = useApp((state) => state.doc)
  const saveState = useApp((state) => state.saveState)
  const lastSavedAt = useApp((state) => state.lastSavedAt)
  const saveError = useApp((state) => state.saveError)
  const readOnly = useApp((state) => state.readOnly)
  const updateSettings = useApp((state) => state.updateSettings)

  const theme = doc?.settings.theme ?? 'paper'
  const dark = theme === 'ink'

  return (
    <header className="app-drag flex h-12 shrink-0 items-center gap-3 border-b border-line bg-bg pl-4 pr-[148px]">
      <div className="app-no-drag flex items-center gap-2">
        <span
          className="flex h-6 w-6 items-center justify-center gap-[2px] rounded-md"
          style={{ background: 'var(--accent)' }}
          aria-hidden
        >
          <span className="h-[10px] w-[2px] rounded-full bg-white/90" />
          <span className="h-[14px] w-[2px] rounded-full bg-white" />
          <span className="h-[7px] w-[2px] rounded-full bg-white/80" />
        </span>
        <span className="text-[13px] font-semibold tracking-wide text-ink">日序</span>
        <span className="text-[11px] text-ink-3">DayOrder</span>
      </div>

      <div className="app-no-drag ml-auto flex items-center gap-2">
        {readOnly ? (
          <span className="rounded-full bg-[color-mix(in_oklab,var(--danger)_14%,transparent)] px-2 py-0.5 text-[11px] text-danger">
            只读模式
          </span>
        ) : null}
        <span
          className="flex items-center gap-1.5 text-[11.5px] text-ink-3"
          data-testid="save-status"
          aria-live="polite"
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{
              background:
                saveState === 'error'
                  ? 'var(--danger)'
                  : saveState === 'saving'
                    ? 'var(--accent)'
                    : saveState === 'saved'
                      ? '#6B8F71'
                      : 'var(--line-strong)',
              animation: saveState === 'saving' ? 'pulse 1.2s ease-in-out infinite' : undefined
            }}
          />
          {saveState === 'error'
            ? `保存失败${saveError ? `：${saveError}` : ''}`
            : saveState === 'saving'
              ? '保存中…'
              : saveState === 'saved' && lastSavedAt
                ? `已保存 ${formatClock(lastSavedAt)}`
                : '已就绪'}
        </span>

        <IconButton
          label={dark ? '切换到暖纸主题' : '切换到墨夜主题'}
          onClick={() => updateSettings({ theme: dark ? 'paper' : 'ink' })}
        >
          {dark ? <Sun size={15} /> : <Moon size={15} />}
        </IconButton>
      </div>
    </header>
  )
}
