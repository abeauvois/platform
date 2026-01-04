import { Skeleton } from '@platform/ui'
import { DollarSign, Scale, Wallet } from 'lucide-react'
import { formatPrice } from '../utils/balance'
import { TradingCard, TradingCardLoader } from './TradingCard'

export interface PortfolioSummaryCardProps {
  spotValue: number
  marginValue: number
  spotCount: number
  marginCount: number
  isLoading: boolean
}

export function PortfolioSummaryCard({
  spotValue,
  marginValue,
  spotCount,
  marginCount,
  isLoading,
}: Readonly<PortfolioSummaryCardProps>) {
  const totalValue = spotValue + marginValue

  return (
    <TradingCard
      title="Portfolio Value"
      icon={<DollarSign className="w-5 h-5" />}
      iconColor="text-primary"
    >
      {isLoading && totalValue === 0 ? (
        <TradingCardLoader color="text-primary" />
      ) : (
        <div className="space-y-3">
          {/* Total Portfolio Value */}
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-1">
              Total Portfolio Value
            </div>
            <div className="text-3xl font-bold text-primary">
              {isLoading ? (
                <Skeleton className="h-9 w-40 mx-auto" />
              ) : (
                formatPrice(totalValue)
              )}
            </div>
          </div>

          {/* Breakdown Stats */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-muted rounded-lg p-2">
              <div className="text-xs flex items-center gap-1 text-muted-foreground">
                <Wallet className="w-3 h-3" />
                Spot
              </div>
              <div className="text-sm font-bold text-secondary mt-1">
                {isLoading ? (
                  <Skeleton className="h-5 w-20" />
                ) : (
                  formatPrice(spotValue)
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {spotCount} assets
              </div>
            </div>
            <div className="bg-muted rounded-lg p-2">
              <div className="text-xs flex items-center gap-1 text-muted-foreground">
                <Scale className="w-3 h-3" />
                Margin
              </div>
              <div className="text-sm font-bold text-yellow-500 mt-1">
                {isLoading ? (
                  <Skeleton className="h-5 w-20" />
                ) : (
                  formatPrice(marginValue)
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {marginCount} assets
              </div>
            </div>
          </div>

          {/* Allocation */}
          {totalValue > 0 && !isLoading && (
            <div className="space-y-1">
              <div className="flex gap-1 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-secondary"
                  style={{ width: `${(spotValue / totalValue) * 100}%` }}
                  title={`Spot: ${((spotValue / totalValue) * 100).toFixed(1)}%`}
                />
                <div
                  className="bg-yellow-500"
                  style={{ width: `${(marginValue / totalValue) * 100}%` }}
                  title={`Margin: ${((marginValue / totalValue) * 100).toFixed(1)}%`}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{((spotValue / totalValue) * 100).toFixed(0)}%</span>
                <span>{((marginValue / totalValue) * 100).toFixed(0)}%</span>
              </div>
            </div>
          )}
        </div>
      )}
    </TradingCard>
  )
}
