import { cn } from '@platform/ui'

interface TabOption {
  value: string
  label: string
}

interface TabGroupProps {
  options: Array<TabOption>
  value: string
  onChange: (value: string) => void
  variant?: 'underline' | 'pill' | 'text'
  size?: 'sm' | 'md'
  className?: string
}

export function TabGroup({
  options,
  value,
  onChange,
  variant = 'text',
  size = 'sm',
  className,
}: Readonly<TabGroupProps>) {
  const baseStyles = 'capitalize transition-colors'
  const sizeStyles = size === 'sm' ? 'text-xs' : 'text-sm'

  const getVariantStyles = (isActive: boolean) => {
    switch (variant) {
      case 'underline':
        return isActive
          ? 'text-foreground border-b-2 border-yellow-500 pb-1'
          : 'text-muted-foreground hover:text-foreground pb-1'
      case 'pill':
        return isActive
          ? 'px-2 py-1 border border-muted-foreground/30 rounded text-foreground'
          : 'px-2 py-1 text-muted-foreground hover:text-foreground'
      case 'text':
      default:
        return isActive
          ? 'text-foreground font-medium'
          : 'text-muted-foreground hover:text-foreground'
    }
  }

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(baseStyles, sizeStyles, getVariantStyles(value === option.value))}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
