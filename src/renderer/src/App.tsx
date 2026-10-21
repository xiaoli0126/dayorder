import { useEffect, useState } from 'react'
import { ACCENTS } from '@shared/constants'
import { useApp } from './store/useApp'
import { useHotkeys } from './hooks/useHotkeys'
import { errorMessage } from './lib/api'
import { flushBeforeExit, scheduleSave } from './lib/persist'
import { TitleBar } from './components/TitleBar'
import { Sidebar } from './components/Sidebar'
import { DayView } from './components/DayView'
import { Inspector } from './components/Inspector'
import { TemplateEditor } from './components/TemplateEditor'
import { SettingsView } from './components/SettingsView'
import { ApplyTemplateDialog } from './components/ApplyTemplateDialog'
import { ModulesDialog } from './components/ModulesDialog'
import { SearchPalette } from './components/SearchPalette'
import { Toasts } from './components/Toasts'

function LoadingScreen({ label }: { label: string }): React.JSX.Element {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 bg-bg">
      <span
        className="flex h-10 w-10 items-center justify-center gap-[3px] rounded-xl"
        style={{ background: 'var(--accent)' }}
        aria-hidden
      >
        <span className="h-4 w-[3px] rounded-full bg-white/90" />
        <span className="h-6 w-[3px] rounded-full bg-white" />
        <span className="h-3 w-[3px] rounded-full bg-white/80" />
      </span>
      <div className="text-[12px] text-ink-2">{label}</div>
    </div>
  )
}

export default function App(): React.JSX.Element {
  const doc = useApp((state) => state.doc)
  const view = useApp((state) => state.view)
  const settings = doc?.settings
  const [fatal, setFatal] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useHotkeys()

  useEffect(() => {
    let cancelled = false
    window.api
      .load()
      .then((result) => {
        if (cancelled) return
        if (!result.ok) {
          setFatal(result.message)
          return
        }
        useApp.getState().bootstrap(result.data)
        void window.api.appInfo().then((info) => {
          if (info.ok) useApp.setState({ appInfo: info.data })
        })
      })
      .catch((error: unknown) => {
        if (!cancelled) setFatal(errorMessage(error))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!doc) return
    return useApp.subscribe((state, previous) => {
      if (state.doc && state.doc !== previous.doc) scheduleSave(state.doc)
    })
  }, [doc])

  useEffect(() => {
    return window.api.onBeforeClose(() => {
      void flushBeforeExit().finally(() => window.api.closeReady())
    })
  }, [])

  useEffect(() => {
    const root = document.documentElement
    const theme = settings?.theme ?? 'paper'
    const accent = settings?.accent ?? 'teal'
    root.style.setProperty('--accent', ACCENTS.find((item) => item.id === accent)?.color ?? '#2F7D6E')

    const apply = (): void => {
      const resolved =
        theme === 'system'
          ? window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'ink'
            : 'paper'
          : theme
      root.dataset.theme = resolved
      void window.api.setAppearance(
        resolved === 'ink'
          ? { color: '#12141A', symbolColor: '#EDEFF2' }
          : { color: '#FAF8F5', symbolColor: '#1F2421' }
      )
    }

    apply()
    if (theme !== 'system') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [settings?.theme, settings?.accent])

  if (fatal) {
    return (
      <div className="flex h-full items-center justify-center bg-bg px-8">
        <div className="w-[420px] rounded-2xl border border-line bg-surface p-6 text-center shadow-[var(--shadow-2)]">
          <h1 className="text-[15px] font-semibold text-ink">无法打开数据</h1>
          <p className="mt-2 break-words text-[12px] leading-5 text-ink-2">{fatal}</p>
          <div className="mt-4 flex justify-center gap-2">
            <button
              type="button"
              className="rounded-lg bg-[var(--accent)] px-3.5 py-2 text-[12.5px] font-medium text-white"
              onClick={() => window.location.reload()}
            >
              重试
            </button>
            <button
              type="button"
              className="rounded-lg border border-line px-3.5 py-2 text-[12.5px] text-ink-2 hover:text-ink"
              onClick={() => void window.api.revealDataDir()}
            >
              打开数据目录
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (loading || !doc) {
    return <LoadingScreen label="正在打开今天…" />
  }

  return (
    <div className="flex h-full flex-col bg-bg" data-testid="app-ready">
      <TitleBar />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="flex min-w-0 flex-1 flex-col">
          {view === 'day' ? <DayView /> : null}
          {view === 'templates' ? <TemplateEditor /> : null}
          {view === 'settings' ? <SettingsView /> : null}
        </main>
        {view === 'day' ? <Inspector /> : null}
      </div>
      <ApplyTemplateDialog />
      <ModulesDialog />
      <SearchPalette />
      <Toasts />
    </div>
  )
}
