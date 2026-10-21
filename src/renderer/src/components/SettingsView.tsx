import { useEffect, useState } from 'react'
import { Database, Download, FolderOpen, RefreshCw, Upload } from 'lucide-react'
import { ACCENTS, HOUR_HEIGHTS, SNAP_OPTIONS, THEMES } from '@shared/constants'
import { formatClock } from '@shared/time'
import { useApp } from '../store/useApp'
import { errorMessage } from '../lib/api'
import { Button, Modal, Switch } from './ui'

function Row({
  title,
  description,
  children
}: {
  title: string
  description?: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="flex items-center gap-4 border-b border-line py-3 last:border-b-0">
      <div className="min-w-0 flex-1">
        <div className="text-[12.5px] font-medium text-ink">{title}</div>
        {description ? <div className="mt-0.5 text-[11px] leading-4 text-ink-3">{description}</div> : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function Segmented<T extends string | number>({
  value,
  options,
  onChange
}: {
  value: T
  options: Array<{ value: T; label: string }>
  onChange: (value: T) => void
}): React.JSX.Element {
  return (
    <div className="flex rounded-lg bg-surface-2 p-0.5">
      {options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={
            value === option.value
              ? 'rounded-md bg-surface px-2.5 py-1 text-[11.5px] font-medium text-ink shadow-[var(--shadow-1)]'
              : 'rounded-md px-2.5 py-1 text-[11.5px] text-ink-2 hover:text-ink'
          }
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export function SettingsView(): React.JSX.Element {
  const doc = useApp((state) => state.doc)
  const appInfo = useApp((state) => state.appInfo)
  const backups = useApp((state) => state.backups)
  const readOnly = useApp((state) => state.readOnly)
  const updateSettings = useApp((state) => state.updateSettings)
  const refreshBackups = useApp((state) => state.refreshBackups)
  const replaceDoc = useApp((state) => state.replaceDoc)
  const pushToast = useApp((state) => state.pushToast)
  const [restoreName, setRestoreName] = useState<string | null>(null)

  useEffect(() => {
    void refreshBackups()
  }, [refreshBackups])

  if (!doc) return <div />

  const settings = doc.settings

  const handleExport = async (): Promise<void> => {
    const result = await window.api.exportDoc(doc)
    if (result.ok) {
      if (result.data) pushToast(`已导出到 ${result.data}`)
    } else {
      pushToast(`导出失败：${result.message}`)
    }
  }

  const handleImport = async (): Promise<void> => {
    try {
      const result = await window.api.importDoc()
      if (!result.ok) {
        pushToast(`导入失败：${result.message}`)
        return
      }
      if (result.data) {
        replaceDoc(result.data)
        pushToast('已导入数据')
      }
    } catch (error) {
      pushToast(`导入失败：${errorMessage(error)}`)
    }
  }

  const handleRestore = async (name: string): Promise<void> => {
    const result = await window.api.restoreBackup(name)
    if (result.ok) {
      replaceDoc(result.data)
      pushToast('已恢复备份')
      void refreshBackups()
    } else {
      pushToast(`恢复失败：${result.message}`)
    }
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-[760px] px-8 py-6">
        <h1 className="text-[20px] font-semibold tracking-tight text-ink">设置</h1>
        <p className="mt-1 text-[12px] text-ink-2">所有数据都在本机，改动即时生效并自动保存。</p>

        <section className="mt-6">
          <h2 className="mb-1 text-[11px] font-medium uppercase tracking-wide text-ink-3">外观</h2>
          <div className="panel px-4">
            <Row title="主题" description="暖纸适合白天，墨夜适合夜间。">
              <Segmented
                value={settings.theme}
                options={THEMES.map((theme) => ({ value: theme.id, label: theme.label }))}
                onChange={(value) => updateSettings({ theme: value })}
              />
            </Row>
            <Row title="强调色" description="用于选中态、进度与主要按钮。">
              <div className="flex items-center gap-1.5">
                {ACCENTS.map((accent) => (
                  <button
                    key={accent.id}
                    type="button"
                    aria-label={`强调色 ${accent.label}`}
                    onClick={() => updateSettings({ accent: accent.id })}
                    className="h-6 w-6 rounded-full border-2"
                    style={{
                      background: accent.color,
                      borderColor: settings.accent === accent.id ? 'var(--text-main)' : 'transparent'
                    }}
                  />
                ))}
              </div>
            </Row>
            <Row title="时间轴行高" description="影响一小时占用的高度，也影响拖拽精度。">
              <Segmented
                value={settings.hourHeight}
                options={HOUR_HEIGHTS.map((height) => ({
                  value: height,
                  label: height === 48 ? '紧凑' : height === 72 ? '标准' : '宽松'
                }))}
                onChange={(value) => updateSettings({ hourHeight: value })}
              />
            </Row>
          </div>
        </section>

        <section className="mt-6">
          <h2 className="mb-1 text-[11px] font-medium uppercase tracking-wide text-ink-3">时间轴</h2>
          <div className="panel px-4">
            <Row title="吸附粒度" description="拖动时对齐到多少分钟。">
              <select
                className="field h-8 w-24 text-[12px]"
                value={settings.snapMinutes}
                onChange={(event) => updateSettings({ snapMinutes: Number(event.target.value) as 5 | 10 | 15 })}
              >
                {SNAP_OPTIONS.map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {minutes} 分钟
                  </option>
                ))}
              </select>
            </Row>
            <Row title="可见时间范围" description="打开时自动滚到起始位置。">
              <div className="flex items-center gap-1.5">
                <select
                  className="field h-8 w-[86px] text-[12px] tabular-nums"
                  value={settings.dayStartHour}
                  onChange={(event) => updateSettings({ dayStartHour: Number(event.target.value) })}
                >
                  {Array.from({ length: 24 }, (_, hour) => (
                    <option key={hour} value={hour}>
                      {String(hour).padStart(2, '0')}:00
                    </option>
                  ))}
                </select>
                <span className="text-ink-3">–</span>
                <select
                  className="field h-8 w-[86px] text-[12px] tabular-nums"
                  value={settings.dayEndHour}
                  onChange={(event) => updateSettings({ dayEndHour: Number(event.target.value) })}
                >
                  {Array.from({ length: 24 }, (_, index) => index + 1).map((hour) => (
                    <option key={hour} value={hour}>
                      {String(hour).padStart(2, '0')}:00
                    </option>
                  ))}
                </select>
              </div>
            </Row>
            <Row title="显示「现在」线" description="今天的时间轴上标出当前时刻。">
              <Switch
                checked={settings.showNowLine}
                label="显示现在线"
                onChange={(value) => updateSettings({ showNowLine: value })}
              />
            </Row>
          </div>
        </section>

        <section className="mt-6">
          <h2 className="mb-1 text-[11px] font-medium uppercase tracking-wide text-ink-3">数据</h2>
          <div className="panel px-4">
            <Row title="自动备份" description="启动时把当前文件复制到 backups 目录，保留最近 20 份与每日 1 份。">
              <Switch
                checked={settings.autoBackup}
                label="自动备份"
                onChange={(value) => updateSettings({ autoBackup: value })}
              />
            </Row>
            <Row title="数据位置" description={appInfo?.isPortable ? '便携模式：数据跟随程序目录。' : '默认位于用户数据目录。'}>
              <div className="flex items-center gap-1.5">
                <code className="max-w-[280px] truncate rounded bg-surface-2 px-2 py-1 text-[10.5px] text-ink-2">
                  {appInfo?.dataDir ?? '…'}
                </code>
                <Button size="sm" variant="outline" onClick={() => void window.api.revealDataDir()}>
                  <FolderOpen size={13} /> 打开
                </Button>
              </div>
            </Row>
            <Row title="导出 / 导入" description="导出为 JSON 备份，或从备份文件恢复。">
              <div className="flex items-center gap-1.5">
                <Button size="sm" variant="outline" onClick={() => void handleExport()}>
                  <Download size={13} /> 导出
                </Button>
                <Button size="sm" variant="outline" disabled={readOnly} onClick={() => void handleImport()}>
                  <Upload size={13} /> 导入
                </Button>
              </div>
            </Row>
          </div>

          <div className="mt-3 panel px-4 py-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[12px] font-medium text-ink">
                <Database size={13} /> 备份列表
              </span>
              <Button size="sm" variant="ghost" onClick={() => void refreshBackups()}>
                <RefreshCw size={12} /> 刷新
              </Button>
            </div>
            {backups.length === 0 ? (
              <p className="py-3 text-[11.5px] text-ink-3">还没有备份，重启应用后会自动生成。</p>
            ) : (
              <div className="flex max-h-[220px] flex-col overflow-y-auto">
                {backups.map((backup) => (
                  <div key={backup.name} className="flex items-center gap-2 border-b border-line py-1.5 last:border-b-0">
                    <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-ink-2">{backup.name}</span>
                    <span className="text-[10.5px] tabular-nums text-ink-3">
                      {formatClock(backup.createdAt)} · {(backup.size / 1024).toFixed(0)} KB
                    </span>
                    <Button size="sm" variant="ghost" onClick={() => setRestoreName(backup.name)}>
                      恢复
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="mt-6">
          <h2 className="mb-1 text-[11px] font-medium uppercase tracking-wide text-ink-3">关于</h2>
          <div className="panel px-4">
            <Row title="日序 DayOrder" description="纯本地的时间轴作息计划器。">
              <span className="text-[11.5px] tabular-nums text-ink-3">v{appInfo?.version ?? '0.1.0'}</span>
            </Row>
            <Row title="快捷键" description="输入框聚焦时不拦截按键。">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10.5px] text-ink-3">
                <span>←/→ 换日</span>
                <span>T 今天</span>
                <span>N 新建</span>
                <span>Delete 删除</span>
                <span>Ctrl+Z 撤销</span>
                <span>Ctrl+F 搜索</span>
              </div>
            </Row>
          </div>
        </section>

        <div className="h-10" />
      </div>

      <Modal
        open={Boolean(restoreName)}
        onOpenChange={(value) => {
          if (!value) setRestoreName(null)
        }}
        title="恢复备份"
        description="当前数据会先被自动备份，然后替换为所选备份。"
        width={420}
        footer={
          <>
            <Button variant="ghost" onClick={() => setRestoreName(null)}>
              取消
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (restoreName) void handleRestore(restoreName)
                setRestoreName(null)
              }}
            >
              恢复
            </Button>
          </>
        }
      >
        <p className="text-[12.5px] text-ink-2">{restoreName}</p>
      </Modal>
    </div>
  )
}
