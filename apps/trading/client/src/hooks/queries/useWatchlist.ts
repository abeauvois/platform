import { useQuery } from '@tanstack/react-query'
import { tradingKeys } from '../../lib/query-keys'
import { fetchWatchlist } from '../../lib/api'
import { REFETCH_INTERVAL } from '../../lib/constants'

import type { WatchlistItemResponse } from '../../lib/api'

/**
 * Fetch user watchlist with real-time prices
 * Only fetches when user is authenticated
 */
export function useWatchlist(enabled = true) {
  return useQuery<Array<WatchlistItemResponse>>({
    queryKey: tradingKeys.watchlist(),
    queryFn: fetchWatchlist,
    enabled,
    refetchInterval: REFETCH_INTERVAL,
    retry: (failureCount, error) => {
      // Don't retry on auth errors
      if (error instanceof Error && error.message === 'Authentication required') {
        return false
      }
      return failureCount < 3
    },
  })
}
