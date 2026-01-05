import { useQuery } from '@tanstack/react-query'
import { tradingKeys } from '../../lib/query-keys'
import { fetchKlines } from '../../lib/api'
import type { KlinesResponse } from '../../lib/api'

const STALE_TIME = 30000 // 30 seconds
const REFRESH_INTERVAL = 60000 // 1 minute

interface UseKlinesParams {
  symbol: string
  interval: string
  limit: number
  enabled?: boolean
}

/**
 * Fetch candlestick data for charting
 * Uses longer cache times since klines data changes less frequently
 */
export function useKlines({ symbol, interval, limit, enabled = true }: UseKlinesParams) {
  return useQuery<KlinesResponse>({
    queryKey: tradingKeys.klinesByParams({ symbol, interval, limit }),
    queryFn: () => fetchKlines({ symbol, interval, limit }),
    enabled,
    staleTime: STALE_TIME,
    refetchInterval: REFRESH_INTERVAL,
  })
}
