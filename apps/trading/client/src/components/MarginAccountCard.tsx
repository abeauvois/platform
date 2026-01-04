import { Scale } from 'lucide-react'

import {
  type MarginBalance,
  formatBalance,
  getUsdValue,
} from '../utils/balance'
import { BalanceItem } from './BalanceItem'
import { TradingCard, TradingCardLoader } from './TradingCard'

export interface MarginAccountCardProps {
  balances: MarginBalance[]
  prices: Map<string, number>
  exchange: string | null
  count: number
  isLoading: boolean
  isPricesLoading: boolean
  error: Error | null
  refetch: () => void
}

export function MarginAccountCard({
  balances,
  prices,
  count,
  isLoading,
  isPricesLoading,
  error,
  refetch,
}: Readonly<MarginAccountCardProps>) {
  return (
    <TradingCard
      title="Margin Balance"
      icon={<Scale className="w-5 h-5" />}
      iconColor="text-yellow-500"
      isLoading={isLoading}
      error={error}
      onRefresh={refetch}
      scrollable
    >
      {isLoading && balances.length === 0 ? (
        <TradingCardLoader color="text-yellow-500" />
      ) : (
        <div className="space-y-2">
          {count === 0 ? (
            <div className="text-center py-4 text-sm text-muted-foreground">
              No margin positions
            </div>
          ) : (
            balances.map(balance => {
              const usdValue = getUsdValue(balance.asset, balance.netAsset, prices)
              const valueColorClass = usdValue !== null && usdValue >= 0 ? 'text-primary' : 'text-destructive'
              return (
                <BalanceItem
                  key={balance.asset}
                  asset={balance.asset}
                  subtitle={
                    <>
                      Net: {formatBalance(balance.netAsset)}
                      {balance.borrowed > 0 && (
                        <span className="text-destructive ml-1">
                          (Borrowed: {formatBalance(balance.borrowed)})
                        </span>
                      )}
                    </>
                  }
                  usdValue={usdValue}
                  isPricesLoading={isPricesLoading}
                  valueColorClass={valueColorClass}
                />
              )
            })
          )}
        </div>
      )}
    </TradingCard>
  )
}
