import { Input, cn } from '@platform/ui'
import { useState, useEffect } from 'react'

interface AmountInputProps {
  value: number
  onChange: (value: number) => void
  suffix: string
  className?: string
  placeholder?: string
}

export function AmountInput({
  value,
  onChange,
  suffix,
  className,
  placeholder = '0',
}: Readonly<AmountInputProps>) {
  const [inputValue, setInputValue] = useState(value === 0 ? '' : String(value))

  // Sync external value changes (e.g., from slider or parent reset)
  useEffect(() => {
    if (value === 0 && inputValue !== '' && inputValue !== '0' && !inputValue.startsWith('0.')) {
      setInputValue('')
    } else if (value !== 0 && Number(inputValue) !== value) {
      setInputValue(String(value))
    }
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value

    // Allow empty, decimal point, or valid decimal numbers
    if (val === '' || val === '.' || /^\d*\.?\d*$/.test(val)) {
      setInputValue(val)
      const numVal = parseFloat(val)
      onChange(isNaN(numVal) ? 0 : numVal)
    }
  }

  return (
    <div className={cn('flex items-center gap-1 bg-input/20 dark:bg-input/30 border border-input rounded-md px-2 py-1', className)}>
      <Input
        type="text"
        inputMode="decimal"
        value={inputValue}
        onChange={handleChange}
        className="w-20 bg-transparent border-0 text-right text-sm font-medium p-0 h-auto focus-visible:ring-0"
        placeholder={placeholder}
      />
      <span className="text-muted-foreground text-xs">{suffix}</span>
    </div>
  )
}
