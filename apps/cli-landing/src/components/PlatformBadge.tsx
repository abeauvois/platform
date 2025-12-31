import { Apple, Monitor } from 'lucide-react'

interface PlatformBadgeProps {
  platform: 'macos' | 'linux' | 'windows' | 'unknown'
  osLabel: string
}

export function PlatformBadge({ platform, osLabel }: PlatformBadgeProps) {
  const Icon = platform === 'macos' ? Apple : Monitor

  return (
    <div className="badge badge-ghost gap-1 font-mono text-xs">
      <Icon className="w-3 h-3" />
      {osLabel}
    </div>
  )
}
