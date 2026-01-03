import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
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
  exchange,
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
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Wallet className="w-6 h-6 text-secondary" />
          Account Balance
        </CardTitle>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          onClick={() => refetch()}
          disabled={isLoading}
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading && balances.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-secondary" />
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              Failed to load balances: {error.message}
            </AlertDescription>
          </Alert>
        )}

        {!isLoading && !error && balances.length > 0 && (
          <div className="flex flex-col gap-4">
            {/* Exchange Info */}
            {exchange && <Badge variant="outline">{exchange}</Badge>}

            {/* Balance List */}
            {filteredBalances.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No balances over ${MIN_USD_VALUE_FILTER}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredBalances.map(balance => (
                  <div
                    key={balance.asset}
                    className="flex items-center justify-between p-4 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                  >
                    <div>
                      <div className="font-bold text-lg">{balance.asset}</div>
                      <div className="text-xs text-muted-foreground">
                        Total: {formatBalance(balance.total)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-xl text-primary">
                        {balance.usdValue === null ? isPricesLoading ? (
                          <Skeleton className="h-6 w-20" />
                        ) : (
                          '—'
                        ) : (
                          formatPrice(balance.usdValue)
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Free: {formatBalance(balance.free)} • Locked:{' '}
                        {formatBalance(balance.locked)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Summary */}
            <div className="border-t pt-4">
              <div className="text-sm text-muted-foreground text-center">
                Showing balances over ${MIN_USD_VALUE_FILTER} USD
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
