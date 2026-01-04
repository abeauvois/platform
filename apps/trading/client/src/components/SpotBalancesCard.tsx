import { Wallet } from 'lucide-react'

import {
  MIN_USD_VALUE_FILTER,
  formatBalance,
  getUsdValue,
} from '../utils/balance'
import { BalanceItem } from './BalanceItem'
import { TradingCard, TradingCardLoader } from './TradingCard'

import type { Balance } from '../utils/balance'

export interface SpotBalancesCardProps {
  balances: Array<Balance>
  prices: Map<string, number>
  exchange: string | null
  isLoading: boolean
  isPricesLoading: boolean
  error: Error | null
  refetch: () => void
}

export function SpotBalancesCard({
  balances,
  prices,
  isLoading,
  isPricesLoading,
  error,
  refetch,
}: Readonly<SpotBalancesCardProps>) {
  // Filter and sort balances by USD value
  const filteredBalances = balances
    .map(balance => ({
      ...balance,
      usdValue: getUsdValue(balance.asset, balance.total, prices),
    }))
    .filter(b => b.usdValue !== null && b.usdValue > MIN_USD_VALUE_FILTER)
    .sort((a, b) => (b.usdValue ?? 0) - (a.usdValue ?? 0))

  return (
    <TradingCard
      title="Spot Balance"
      icon={<Wallet className="w-5 h-5" />}
      iconColor="text-secondary"
      isLoading={isLoading}
      error={error}
      onRefresh={refetch}
      scrollable
    >
      {isLoading && balances.length === 0 ? (
        <TradingCardLoader color="text-secondary" />
      ) : (
        <div className="space-y-2">
          {filteredBalances.length === 0 ? (
            <div className="text-center py-4 text-sm text-muted-foreground">
              No balances over ${MIN_USD_VALUE_FILTER}
            </div>
          ) : (
            filteredBalances.map(balance => (
              <BalanceItem
                key={balance.asset}
                asset={balance.asset}
                subtitle={formatBalance(balance.total)}
                usdValue={balance.usdValue}
                isPricesLoading={isPricesLoading}
              />
            ))
          )}
        </div>
      )}
    </TradingCard>
  )
}
