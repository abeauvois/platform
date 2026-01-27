import { Input, cn } from '@abeauvois/platform-ui'
import { calculatePricePrecision, formatPrice, getMinMove } from '@abeauvois/platform-trading-domain'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface NumberInputProps {
  label: string
  value: string
  onChange: (value: string) => void
  suffix: string
  referenceValue?: number
  min?: number
  className?: string
}

export function NumberInput({
  label,
  value,
  onChange,
  suffix,
  referenceValue,
  min = 0,
  className,
}: Readonly<NumberInputProps>) {
  const numValue = Number(value) || 0
  const precision = calculatePricePrecision(referenceValue ?? numValue)
  const step = getMinMove(precision)

  const increment = () => {
    onChange(formatPrice(numValue + step, precision))
  }

  const decrement = () => {
    onChange(formatPrice(Math.max(min, numValue - step), precision))
  }

  return (
    <div className={cn('relative', className)}>
      <div className="flex items-center bg-input/20 dark:bg-input/30 border border-input rounded-md px-3 py-2">
        <span className="text-muted-foreground text-xs w-12">{label}</span>
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-transparent border-0 text-right text-sm font-medium p-0 h-auto focus-visible:ring-0"
        />
        <span className="text-muted-foreground text-xs ml-2">{suffix}</span>
      </div>
      <div className="absolute right-8 top-1/2 -translate-y-1/2 flex flex-col">
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground p-0.5"
          onClick={increment}
        >
          <ChevronUp className="w-3 h-3" />
        </button>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground p-0.5"
          onClick={decrement}
        >
          <ChevronDown className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}
