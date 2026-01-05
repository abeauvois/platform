import { useQuery } from '@tanstack/react-query'
import { tradingKeys } from '../../lib/query-keys'
import { fetchMarginBalances } from '../../lib/api'
import type { MarginBalanceResponse } from '../../utils/balance'

const REFRESH_INTERVAL = 5000

export function useMarginBalances() {
  return useQuery<MarginBalanceResponse>({
    queryKey: tradingKeys.marginBalances(),
    queryFn: fetchMarginBalances,
    refetchInterval: REFRESH_INTERVAL,
  })
}
