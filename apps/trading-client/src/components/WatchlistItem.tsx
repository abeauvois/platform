import { formatPrice } from '@abeauvois/platform-trading-domain'
import { X, RotateCcw } from 'lucide-react'
import { Skeleton } from '@abeauvois/platform-ui'

import { extractBaseAsset } from '../utils/symbol'

export interface WatchlistItemProps {
  symbol: string
  price: number
  priceChangePercent: number | null
  /** Reference timestamp in Unix ms (global, same for all items) */
  referenceTimestamp?: number | null
  /** Price change from reference point */
  referencePriceChangePercent?: number | null
  isLoading?: boolean
  isSelected?: boolean
  onSelect: (symbol: string) => void
  onRemove: (symbol: string) => void
  /** Callback to clear the global reference timestamp (applies to all items) */
  onClearReference?: () => void
}

/**
 * Format how long ago the reference was set
 */
function formatTimeSinceReference(timestamp: number): string {
  const now = Date.now()
  const diffMs = now - timestamp
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffHours / 24)

  if (diffDays > 0) {
    return `${diffDays}d ago`
  }
  if (diffHours > 0) {
    return `${diffHours}h ago`
  }
  return 'now'
}

export function WatchlistItem({
  symbol,
  price,
  priceChangePercent,
  referenceTimestamp,
  referencePriceChangePercent,
  isLoading = false,
  isSelected = false,
  onSelect,
  onRemove,
  onClearReference,
}: Readonly<WatchlistItemProps>) {
  const baseAsset = extractBaseAsset(symbol)
  const hasReference = referenceTimestamp !== null && referenceTimestamp !== undefined

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

  const renderReferenceChange = () => {
    // Always show reference change since backend calculates it (even with default reference)
    if (referencePriceChangePercent === null || referencePriceChangePercent === undefined) {
      return null
    }
    const isPositive = referencePriceChangePercent >= 0
    const colorClass = isPositive ? 'text-blue-400' : 'text-blue-600'
    const sign = isPositive ? '+' : ''
    // Show time ago only if explicit reference is set
    const timeAgo = hasReference ? formatTimeSinceReference(referenceTimestamp!) : null
    return (
      <span className={`text-xs ${colorClass}`} title={timeAgo ? `From ${timeAgo}` : 'Default reference (10 candles back)'}>
        {sign}
        {referencePriceChangePercent.toFixed(2)}%
        {timeAgo && <span className="text-blue-400/60 ml-1">({timeAgo})</span>}
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

  const handleClearReference = (e: React.MouseEvent) => {
    e.stopPropagation()
    onClearReference?.()
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
          <div className="flex flex-col items-end">
            {renderPriceChange()}
            {renderReferenceChange()}
          </div>
        </div>
        <div className="flex flex-col gap-0.5">
          {hasReference && onClearReference && (
            <button
              type="button"
              onClick={handleClearReference}
              className="p-1 rounded-full opacity-0 group-hover:opacity-100 hover:bg-blue-500/20 transition-opacity"
              title="Clear reference"
            >
              <RotateCcw className="w-3 h-3 text-blue-400" />
            </button>
          )}
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
    </div>
  )
}
