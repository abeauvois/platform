import { useQuery } from '@tanstack/react-query'
import { tradingKeys } from '../../lib/query-keys'
import { fetchMarginBalances } from '../../lib/api'
import { REFETCH_INTERVAL } from '../../lib/constants'
import type { MarginBalanceResponse } from '../../utils/balance'

export function useMarginBalances() {
  return useQuery<MarginBalanceResponse>({
    queryKey: tradingKeys.marginBalances(),
    queryFn: fetchMarginBalances,
    refetchInterval: REFETCH_INTERVAL,
  })
}
