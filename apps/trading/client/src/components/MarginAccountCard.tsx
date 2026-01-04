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
import { AlertCircle, Loader2, RefreshCw, Scale } from 'lucide-react'
import {
  type MarginBalance,
  formatBalance,
  formatPrice,
  getUsdValue,
} from '../utils/balance'

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
  const renderUsdValue = (usdValue: number | null) => {
    if (usdValue !== null) {
      return formatPrice(usdValue)
    }
    if (isPricesLoading) {
      return <Skeleton className="h-4 w-16" />
    }
    return '—'
  }

  return (
    <Card className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between py-3 flex-shrink-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Scale className="w-5 h-5 text-yellow-500" />
          Margin Balance
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
            <Loader2 className="h-6 w-6 animate-spin text-yellow-500" />
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

        {!isLoading && !error && (
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
                  <div
                    key={balance.asset}
                    className="flex items-center justify-between p-2 bg-muted rounded-lg"
                  >
                    <div>
                      <div className="font-bold text-sm">{balance.asset}</div>
                      <div className="text-xs text-muted-foreground">
                        Net: {formatBalance(balance.netAsset)}
                        {balance.borrowed > 0 && (
                          <span className="text-destructive ml-1">
                            (Borrowed: {formatBalance(balance.borrowed)})
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={`font-bold text-sm ${valueColorClass}`}>
                      {renderUsdValue(usdValue)}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
