import { Skeleton } from '@abeauvois/platform-ui'

import { formatPrice } from '../utils/balance'

import type { ReactNode } from 'react'

export interface BalanceItemProps {
  asset: string
  subtitle: ReactNode
  usdValue: number | null
  priceChangePercent?: number | null
  lockedAmount?: number
  isPricesLoading?: boolean
  valueColorClass?: string
  isSelected?: boolean
  onClick?: (asset: string) => void
}

export function BalanceItem({
  asset,
  subtitle,
  usdValue,
  priceChangePercent,
  lockedAmount,
  isPricesLoading = false,
  valueColorClass = 'text-primary',
  isSelected = false,
  onClick,
}: Readonly<BalanceItemProps>) {
  const renderUsdValue = () => {
    if (usdValue !== null) {
      return formatPrice(usdValue)
    }
    if (isPricesLoading) {
      return <Skeleton className="h-4 w-16" />
    }
    return '—'
  }

  const renderPriceChange = () => {
    if (priceChangePercent === null || priceChangePercent === undefined) {
      return null
    }
    const isPositive = priceChangePercent >= 0
    const colorClass = isPositive ? 'text-success' : 'text-error'
    const sign = isPositive ? '+' : ''
    return (
      <span className={`text-xs ${colorClass}`}>
        {sign}{priceChangePercent.toFixed(2)}%
      </span>
    )
  }

  const handleClick = () => {
    onClick?.(asset)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`w-full flex items-center justify-between p-2 rounded-lg transition-all text-left ${isSelected
          ? 'bg-primary/20 border-l-4 border-primary'
          : 'bg-muted hover:bg-muted/80 cursor-pointer'
        }`}
    >
      <div>
        <div className="font-bold text-sm">{asset}</div>
        <div className="text-xs text-muted-foreground">{subtitle}</div>
      </div>
      <div className="text-right">
        <div className="flex items-center justify-end gap-2">
          <span className={`font-bold text-sm ${valueColorClass}`}>
            {renderUsdValue()}
          </span>
          {renderPriceChange()}
        </div>
        {lockedAmount !== undefined && lockedAmount > 0 && (
          <div className="text-xs text-yellow-500">
            {lockedAmount.toFixed(2)} locked
          </div>
        )}
      </div>
    </button>
  )
}
