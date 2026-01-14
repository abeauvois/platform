import { useQuery } from '@tanstack/react-query'
import { tradingKeys } from '../../lib/query-keys'
import { fetchKlines } from '../../lib/api'
import { REFETCH_INTERVAL } from '../../lib/constants'
import type { KlinesResponse } from '../../lib/api'

const STALE_TIME = 30_000 // 30 seconds

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
    refetchInterval: REFETCH_INTERVAL,
  })
}
