import { Card, CardContent, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@platform/ui'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'

import { formatPrice } from '../utils/balance'
import type { OrderMode } from '../hooks/useOrderMode'

const MAX_ORDER_VALUE_USD = 500

interface DraggableButtonProps {
  id: string
  side: 'buy' | 'sell'
  disabled?: boolean
  children: React.ReactNode
  onClick?: () => void
}

function DraggableButton({ id, side, disabled = false, children, onClick }: Readonly<DraggableButtonProps>) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    data: { side },
    disabled,
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.8 : disabled ? 0.5 : 1,
    cursor: disabled ? 'not-allowed' : isDragging ? 'grabbing' : 'grab',
  }

  const bgColor = side === 'buy'
    ? disabled ? 'bg-green-500/50' : 'bg-green-500 hover:bg-green-600'
    : disabled ? 'bg-red-500/50' : 'bg-red-500 hover:bg-red-600'

  return (
    <button
      ref={setNodeRef}
      style={style}
      {...(disabled ? {} : listeners)}
      {...attributes}
      onClick={disabled ? undefined : onClick}
      className={`${bgColor} text-white font-bold py-4 px-6 rounded-lg text-lg shadow-lg transition-all select-none touch-none`}
      type="button"
      disabled={disabled}
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
  buyAmount: number
  sellAmount: number
  onBuyAmountChange: (amount: number) => void
  onSellAmountChange: (amount: number) => void
  /** Current order mode */
  orderMode: OrderMode
  /** Callback when order mode changes */
  onOrderModeChange: (mode: OrderMode) => void
  /** Callback when BUY button is clicked (for stop-market orders) */
  onBuyClick: () => void
  /** Callback when SELL button is clicked (for stop-market orders) */
  onSellClick: () => void
  /** Whether the user is authenticated (required for trading) */
  isAuthenticated: boolean
}

export function DragOrderPanel({
  baseAsset,
  availableBase,
  availableQuote,
  currentPrice,
  buyAmount,
  sellAmount,
  onBuyAmountChange,
  onSellAmountChange,
  orderMode,
  onOrderModeChange,
  onBuyClick,
  onSellClick,
  isAuthenticated,
}: Readonly<DragOrderPanelProps>) {
  // Calculate order values in USD
  const buyOrderValue = buyAmount * currentPrice
  const sellOrderValue = sellAmount * currentPrice

  // Determine if buttons should be disabled (also disabled when not authenticated)
  const isBuyDisabled = !isAuthenticated || buyAmount <= 0 || buyOrderValue > MAX_ORDER_VALUE_USD || buyOrderValue > availableQuote
  const isSellDisabled = !isAuthenticated || sellAmount <= 0 || sellOrderValue > MAX_ORDER_VALUE_USD || sellAmount > availableBase

  // Format available amounts
  const formatAmount = (amount: number, decimals = 4) => {
    if (amount >= 1000) return amount.toFixed(2)
    if (amount >= 1) return amount.toFixed(decimals)
    return amount.toFixed(6)
  }

  // Get instruction text based on auth state and order mode
  const instructionText = !isAuthenticated
    ? 'Sign in to place orders'
    : orderMode === 'stop_limit'
      ? 'Drag to place stop-limit order • Click for stop-market'
      : 'Drag to place limit order at that price level'

  return (
    <Card className="bg-card/50 backdrop-blur">
      <CardContent className="p-4">
        {/* Order Mode Selector */}
        <div className="flex justify-center mb-4">
          <Select value={orderMode} onValueChange={(value) => onOrderModeChange(value as OrderMode)}>
            <SelectTrigger className="w-[200px] bg-input/50 border-input">
              <SelectValue placeholder="Select order mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="stop_limit">Stop-Limit (default)</SelectItem>
              <SelectItem value="limit">Limit Order</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-center gap-8">
          {/* BUY Section */}
          <div className="flex flex-col items-center gap-2">
            <div className="text-xs text-muted-foreground">
              Available: <span className="text-green-400 font-medium">{formatPrice(availableQuote)}</span>
            </div>
            <DraggableButton
              id="drag-buy"
              side="buy"
              disabled={isBuyDisabled}
              onClick={orderMode === 'stop_limit' ? onBuyClick : undefined}
            >
              BUY
            </DraggableButton>
            <div className="flex items-center gap-1 bg-input/20 dark:bg-input/30 border border-input rounded-md px-2 py-1">
              <Input
                type="number"
                value={buyAmount || ''}
                onChange={(e) => onBuyAmountChange(Number(e.target.value))}
                className="w-20 bg-transparent border-0 text-right text-sm font-medium p-0 h-auto focus-visible:ring-0"
                step="0.0001"
                min="0"
                placeholder="0"
              />
              <span className="text-muted-foreground text-xs">{baseAsset}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              ≈ {formatPrice(buyOrderValue)}
            </div>
            {isBuyDisabled && buyAmount > 0 && (
              <div className="text-xs text-red-400">
                {buyOrderValue > MAX_ORDER_VALUE_USD
                  ? `Max ${formatPrice(MAX_ORDER_VALUE_USD)}`
                  : buyOrderValue > availableQuote
                    ? 'Insufficient balance'
                    : ''}
              </div>
            )}
          </div>

          {/* Center info */}
          <div className="flex flex-col items-center gap-1 text-muted-foreground">
            <span className="text-xs">Max order</span>
            <span className="text-sm font-medium">{formatPrice(MAX_ORDER_VALUE_USD)}</span>
          </div>

          {/* SELL Section */}
          <div className="flex flex-col items-center gap-2">
            <div className="text-xs text-muted-foreground">
              Available: <span className="text-red-400 font-medium">{formatAmount(availableBase)} {baseAsset}</span>
            </div>
            <DraggableButton
              id="drag-sell"
              side="sell"
              disabled={isSellDisabled}
              onClick={orderMode === 'stop_limit' ? onSellClick : undefined}
            >
              SELL
            </DraggableButton>
            <div className="flex items-center gap-1 bg-input/20 dark:bg-input/30 border border-input rounded-md px-2 py-1">
              <Input
                type="number"
                value={sellAmount || ''}
                onChange={(e) => onSellAmountChange(Number(e.target.value))}
                className="w-20 bg-transparent border-0 text-right text-sm font-medium p-0 h-auto focus-visible:ring-0"
                step="0.0001"
                min="0"
                placeholder="0"
              />
              <span className="text-muted-foreground text-xs">{baseAsset}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              ≈ {formatPrice(sellOrderValue)}
            </div>
            {isSellDisabled && sellAmount > 0 && (
              <div className="text-xs text-red-400">
                {sellOrderValue > MAX_ORDER_VALUE_USD
                  ? `Max ${formatPrice(MAX_ORDER_VALUE_USD)}`
                  : sellAmount > availableBase
                    ? 'Insufficient balance'
                    : ''}
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-3">
          {instructionText}
        </p>
      </CardContent>
    </Card>
  )
}
