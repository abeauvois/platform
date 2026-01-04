import { Skeleton } from '@platform/ui'

import { formatPrice } from '../utils/balance'

import type { ReactNode } from 'react'

export interface BalanceItemProps {
  asset: string
  subtitle: ReactNode
  usdValue: number | null
  isPricesLoading?: boolean
  valueColorClass?: string
}

export function BalanceItem({
  asset,
  subtitle,
  usdValue,
  isPricesLoading = false,
  valueColorClass = 'text-primary',
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

  return (
    <div className="flex items-center justify-between p-2 bg-muted rounded-lg">
      <div>
        <div className="font-bold text-sm">{asset}</div>
        <div className="text-xs text-muted-foreground">{subtitle}</div>
      </div>
      <div className={`font-bold text-sm ${valueColorClass}`}>
        {renderUsdValue()}
      </div>
    </div>
  )
}
