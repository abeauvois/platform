import { formatPrice } from '@platform/trading-domain'
import { X } from 'lucide-react'
import { Skeleton } from '@platform/ui'

import { extractBaseAsset } from '../utils/symbol'

export interface WatchlistItemProps {
  symbol: string
  price: number
  priceChangePercent: number | null
  isLoading?: boolean
  isSelected?: boolean
  onSelect: (symbol: string) => void
  onRemove: (symbol: string) => void
}

export function WatchlistItem({
  symbol,
  price,
  priceChangePercent,
  isLoading = false,
  isSelected = false,
  onSelect,
  onRemove,
}: Readonly<WatchlistItemProps>) {
  const baseAsset = extractBaseAsset(symbol)

  const renderPrice = () => {
    if (isLoading) {
      return <Skeleton className="h-4 w-16" />
    }
    return `$${formatPrice(price)}`
  }

  const renderPriceChange = () => {
    if (priceChangePercent === null) {
      return null
    }
    const isPositive = priceChangePercent >= 0
    const colorClass = isPositive ? 'text-success' : 'text-error'
    const sign = isPositive ? '+' : ''
    return (
      <span className={`text-xs ${colorClass}`}>
        {sign}
        {priceChangePercent.toFixed(2)}%
      </span>
    )
  }

  const handleSelect = () => {
    onSelect(symbol)
  }

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    onRemove(symbol)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onSelect(symbol)
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleSelect}
      onKeyDown={handleKeyDown}
      className={`group w-full flex items-center justify-between p-2 rounded-lg transition-all text-left ${
        isSelected
          ? 'bg-primary/20 border-l-4 border-primary'
          : 'bg-muted hover:bg-muted/80 cursor-pointer'
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm">{baseAsset}</div>
        <div className="text-xs text-muted-foreground truncate">{symbol}</div>
      </div>
      <div className="flex items-center gap-2">
        <div className="text-right">
          <div className="font-bold text-sm text-primary">{renderPrice()}</div>
          {renderPriceChange()}
        </div>
        <button
          type="button"
          onClick={handleRemove}
          className="p-1 rounded-full opacity-0 group-hover:opacity-100 hover:bg-error/20 transition-opacity"
          title="Remove from watchlist"
        >
          <X className="w-3 h-3 text-error" />
        </button>
      </div>
    </div>
  )
}
