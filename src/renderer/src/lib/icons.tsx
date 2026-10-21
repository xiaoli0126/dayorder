import {
  BookOpen,
  Briefcase,
  Coffee,
  Code,
  Dumbbell,
  HeartPulse,
  Home,
  MoreHorizontal,
  Music,
  Sparkles,
  type LucideIcon
} from 'lucide-react'
import { MODULE_ICONS } from '@shared/constants'

export const MODULE_ICON_MAP: Record<string, LucideIcon> = {
  'book-open': BookOpen,
  briefcase: Briefcase,
  dumbbell: Dumbbell,
  coffee: Coffee,
  home: Home,
  ellipsis: MoreHorizontal,
  code: Code,
  music: Music,
  'heart-pulse': HeartPulse,
  sparkles: Sparkles
}

const ICON_LABELS: Record<string, string> = {
  'book-open': '书本',
  briefcase: '公文包',
  dumbbell: '哑铃',
  coffee: '咖啡',
  home: '家',
  ellipsis: '省略',
  code: '代码',
  music: '音乐',
  'heart-pulse': '心率',
  sparkles: '闪光'
}

export const AVAILABLE_ICONS: Array<{ name: string; label: string; Icon: LucideIcon }> = MODULE_ICONS.map(
  (name) => ({
    name,
    label: ICON_LABELS[name] ?? name,
    Icon: MODULE_ICON_MAP[name] ?? MoreHorizontal
  })
)

export function ModuleIcon({ name, size = 14 }: { name: string; size?: number }): React.JSX.Element {
  const Icon = MODULE_ICON_MAP[name] ?? MoreHorizontal
  return <Icon size={size} strokeWidth={1.8} aria-hidden />
}
