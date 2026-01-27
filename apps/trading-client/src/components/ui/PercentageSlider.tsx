import { cn } from '@abeauvois/platform-ui'

interface PercentageSliderProps {
  value: number
  onChange: (value: number) => void
  steps?: Array<number>
  className?: string
}

export function PercentageSlider({
  value,
  onChange,
  steps = [0, 25, 50, 75, 100],
  className,
}: Readonly<PercentageSliderProps>) {
  return (
    <div className={cn('flex items-center gap-2 py-1', className)}>
      {steps.map((step, index) => (
        <div key={step} className="contents">
          {index > 0 && (
            <div className="flex-1 relative h-0.5 bg-muted-foreground/30">
              <div
                className="absolute h-full bg-muted-foreground/50"
                style={{ width: value >= step ? '100%' : value > steps[index - 1] ? `${((value - steps[index - 1]) / (step - steps[index - 1])) * 100}%` : '0%' }}
              />
            </div>
          )}
          <button
            type="button"
            className={cn(
              'w-3 h-3 rotate-45 border transition-colors',
              value >= step
                ? 'border-foreground bg-foreground'
                : 'border-muted-foreground/50 hover:border-muted-foreground'
            )}
            onClick={() => onChange(step)}
          />
        </div>
      ))}
    </div>
  )
}
