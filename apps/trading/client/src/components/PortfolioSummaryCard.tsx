import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Skeleton,
} from '@platform/ui'
import { DollarSign, Loader2, Scale, Wallet } from 'lucide-react'
import { formatPrice } from '../utils/balance'

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
}: PortfolioSummaryCardProps) {
  const totalValue = spotValue + marginValue

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-6 h-6 text-primary" />
          Portfolio Value
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && totalValue === 0 && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {(!isLoading || totalValue > 0) && (
          <div className="space-y-4">
            {/* Total Portfolio Value */}
            <div className="text-center py-4">
              <div className="text-sm text-muted-foreground mb-1">
                Total Portfolio Value
              </div>
              <div className="text-5xl font-bold text-primary">
                {isLoading ? (
                  <Skeleton className="h-12 w-48 mx-auto" />
                ) : (
                  formatPrice(totalValue)
                )}
              </div>
            </div>

            {/* Breakdown Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted rounded-lg p-4">
                <div className="text-xs flex items-center gap-1 text-muted-foreground">
                  <Wallet className="w-3 h-3" />
                  Spot Account
                </div>
                <div className="text-lg font-bold text-secondary mt-1">
                  {isLoading ? (
                    <Skeleton className="h-6 w-24" />
                  ) : (
                    formatPrice(spotValue)
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {spotCount} assets
                </div>
              </div>
              <div className="bg-muted rounded-lg p-4">
                <div className="text-xs flex items-center gap-1 text-muted-foreground">
                  <Scale className="w-3 h-3" />
                  Margin Account
                </div>
                <div className="text-lg font-bold text-yellow-500 mt-1">
                  {isLoading ? (
                    <Skeleton className="h-6 w-24" />
                  ) : (
                    formatPrice(marginValue)
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {marginCount} assets
                </div>
              </div>
            </div>

            {/* Allocation */}
            {totalValue > 0 && !isLoading && (
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground text-center">
                  Allocation
                </div>
                <div className="flex gap-1 h-3 rounded-full overflow-hidden">
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
                  <span>Spot: {((spotValue / totalValue) * 100).toFixed(1)}%</span>
                  <span>Margin: {((marginValue / totalValue) * 100).toFixed(1)}%</span>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
