import { Card, CardContent, Input } from '@platform/ui'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'

interface DraggableButtonProps {
  id: string
  side: 'buy' | 'sell'
  children: React.ReactNode
}

function DraggableButton({ id, side, children }: Readonly<DraggableButtonProps>) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    data: { side },
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.8 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
  }

  const bgColor = side === 'buy'
    ? 'bg-green-500 hover:bg-green-600'
    : 'bg-red-500 hover:bg-red-600'

  return (
    <button
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`${bgColor} text-white font-bold py-6 px-8 rounded-lg text-xl shadow-lg transition-all select-none touch-none`}
      type="button"
    >
      {children}
    </button>
  )
}

export interface DragOrderPanelProps {
  symbol: string
  baseAsset: string
  quoteAsset: string
  availableBase: number
  availableQuote: number
  currentPrice: number
  amount: number
  onAmountChange: (amount: number) => void
}

export function DragOrderPanel({
  baseAsset,
  quoteAsset,
  availableBase,
  availableQuote,
  currentPrice,
  amount,
  onAmountChange,
}: Readonly<DragOrderPanelProps>) {
  // Calculate available amounts for display
  const availableForBuy = currentPrice > 0 ? availableQuote / currentPrice : 0
  const availableForSell = availableBase

  // Use the larger available amount for display
  const displayAvailable = Math.max(availableForBuy, availableForSell)
  const availableAsset = availableForSell > availableForBuy ? baseAsset : quoteAsset

  return (
    <Card className="bg-card/50 backdrop-blur">
      <CardContent className="p-4">
        <div className="flex items-center justify-center gap-6">
          {/* BUY Button */}
          <DraggableButton id="drag-buy" side="buy">
            BUY
          </DraggableButton>

          {/* Amount Input */}
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-2 bg-input/20 dark:bg-input/30 border border-input rounded-md px-3 py-2">
              <span className="text-muted-foreground text-sm">Amount</span>
              <Input
                type="number"
                value={amount}
                onChange={(e) => onAmountChange(Number(e.target.value))}
                className="w-24 bg-transparent border-0 text-right text-lg font-medium p-0 h-auto focus-visible:ring-0"
                step="0.0001"
                min="0"
              />
              <span className="text-muted-foreground text-sm">{baseAsset}</span>
            </div>
            <span className="text-xs text-muted-foreground">
              Avbl: {displayAvailable.toFixed(6)} {availableAsset}
            </span>
          </div>

          {/* SELL Button */}
          <DraggableButton id="drag-sell" side="sell">
            SELL
          </DraggableButton>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-3">
          Drag a button onto the chart to place an order at that price level
        </p>
      </CardContent>
    </Card>
  )
}
