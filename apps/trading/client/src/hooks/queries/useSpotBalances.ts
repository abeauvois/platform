import { useQuery } from '@tanstack/react-query'
import { tradingKeys } from '../../lib/query-keys'
import { fetchSpotBalances } from '../../lib/api'
import type { BalanceResponse } from '../../utils/balance'

const REFRESH_INTERVAL = 5000

export function useSpotBalances() {
  return useQuery<BalanceResponse>({
    queryKey: tradingKeys.spotBalances(),
    queryFn: fetchSpotBalances,
    refetchInterval: REFRESH_INTERVAL,
  })
}
