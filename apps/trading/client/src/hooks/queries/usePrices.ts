import { useQuery } from '@tanstack/react-query'
import { tradingKeys } from '../../lib/query-keys'
import { fetchPrices } from '../../lib/api'
import { REFETCH_INTERVAL } from '../../lib/constants'
import { getTradableSymbol, STABLECOINS } from '../../utils/balance'
import type { SymbolPrice } from '../../utils/balance'

/**
 * Fetch prices for a list of assets
 * Automatically converts asset names to trading symbols (e.g., BTC -> BTCUSDT)
 */
export function usePrices(assets: string[]) {
  const symbols = assets
    .map(getTradableSymbol)
    .filter((tradable) => !STABLECOINS.has(tradable))
    .map((tradable) => `${tradable}USDT`)

  return useQuery<SymbolPrice[]>({
    queryKey: tradingKeys.pricesBySymbols(symbols),
    queryFn: () => fetchPrices(symbols),
    enabled: symbols.length > 0,
    refetchInterval: REFETCH_INTERVAL,
  })
}
