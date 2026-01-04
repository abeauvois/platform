import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Skeleton,
} from '@platform/ui'
import { AlertCircle, Loader2, RefreshCw, Wallet } from 'lucide-react'
import {

  MIN_USD_VALUE_FILTER,
  formatBalance,
  formatPrice,
  getUsdValue
} from '../utils/balance'
import type { Balance } from '../utils/balance';

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
    <Card className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between py-3 flex-shrink-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Wallet className="w-5 h-5 text-secondary" />
          Spot Balance
        </CardTitle>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-full"
          onClick={() => refetch()}
          disabled={isLoading}
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent className="pt-0 flex-1 overflow-y-auto">
        {isLoading && balances.length === 0 && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-secondary" />
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription className="text-xs">
              {error.message}
            </AlertDescription>
          </Alert>
        )}

        {!isLoading && !error && balances.length > 0 && (
          <div className="space-y-2">
            {filteredBalances.length === 0 ? (
              <div className="text-center py-4 text-sm text-muted-foreground">
                No balances over ${MIN_USD_VALUE_FILTER}
              </div>
            ) : (
              filteredBalances.map(balance => (
                <div
                  key={balance.asset}
                  className="flex items-center justify-between p-2 bg-muted rounded-lg"
                >
                  <div>
                    <div className="font-bold text-sm">{balance.asset}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatBalance(balance.total)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-sm text-primary">
                      {balance.usdValue === null ? isPricesLoading ? (
                        <Skeleton className="h-4 w-16" />
                      ) : (
                        '—'
                      ) : (
                        formatPrice(balance.usdValue)
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
