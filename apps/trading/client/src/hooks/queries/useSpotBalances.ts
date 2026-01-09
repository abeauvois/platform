import { useQuery } from '@tanstack/react-query'
import { tradingKeys } from '../../lib/query-keys'
import { fetchSpotBalances } from '../../lib/api'
import { REFETCH_INTERVAL } from '../../lib/constants'
import type { BalanceResponse } from '../../utils/balance'

export function useSpotBalances() {
  return useQuery<BalanceResponse>({
    queryKey: tradingKeys.spotBalances(),
    queryFn: fetchSpotBalances,
    refetchInterval: REFETCH_INTERVAL,
  })
}
