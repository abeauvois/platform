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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
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
  exchange,
  count,
  isLoading,
  isPricesLoading,
  error,
  refetch,
}: MarginAccountCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Scale className="w-6 h-6 text-yellow-500" />
          Margin Account
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
            <Loader2 className="h-8 w-8 animate-spin text-yellow-500" />
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              Failed to load margin balances: {error.message}
            </AlertDescription>
          </Alert>
        )}

        {!isLoading && !error && (
          <div className="space-y-4">
            {/* Exchange Info */}
            {exchange && <Badge variant="outline">{exchange} Margin</Badge>}

            {/* Margin Balance Table */}
            {count === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No margin positions
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset</TableHead>
                    <TableHead className="text-right">Free</TableHead>
                    <TableHead className="text-right">Locked</TableHead>
                    <TableHead className="text-right">Borrowed</TableHead>
                    <TableHead className="text-right">Interest</TableHead>
                    <TableHead className="text-right">Net Asset</TableHead>
                    <TableHead className="text-right">USD Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {balances.map(balance => {
                    const usdValue = getUsdValue(
                      balance.asset,
                      balance.netAsset,
                      prices
                    )
                    return (
                      <TableRow key={balance.asset}>
                        <TableCell className="font-bold">
                          {balance.asset}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatBalance(balance.free)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatBalance(balance.locked)}
                        </TableCell>
                        <TableCell className="text-right text-destructive">
                          {balance.borrowed > 0
                            ? `-${formatBalance(balance.borrowed)}`
                            : '0'}
                        </TableCell>
                        <TableCell className="text-right text-destructive">
                          {balance.interest > 0
                            ? `-${formatBalance(balance.interest)}`
                            : '0'}
                        </TableCell>
                        <TableCell
                          className={`text-right font-bold ${balance.netAsset >= 0 ? 'text-green-500' : 'text-destructive'}`}
                        >
                          {formatBalance(balance.netAsset)}
                        </TableCell>
                        <TableCell
                          className={`text-right font-bold ${usdValue !== null && usdValue >= 0 ? 'text-primary' : 'text-destructive'}`}
                        >
                          {usdValue !== null ? (
                            formatPrice(usdValue)
                          ) : isPricesLoading ? (
                            <Skeleton className="h-4 w-16 ml-auto" />
                          ) : (
                            '—'
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}

            {/* Summary */}
            <div className="text-sm text-muted-foreground text-center">
              {count} asset{count === 1 ? '' : 's'} in margin account
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
