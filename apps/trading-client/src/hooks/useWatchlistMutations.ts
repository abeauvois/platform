import { useMutation, useQueryClient } from '@tanstack/react-query'
import { tradingKeys } from '../lib/query-keys'
import { addToWatchlist, removeFromWatchlist } from '../lib/api'

/**
 * Hook for watchlist add/remove mutations with cache invalidation
 */
export function useWatchlistMutations() {
  const queryClient = useQueryClient()

  const addMutation = useMutation({
    mutationFn: addToWatchlist,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tradingKeys.watchlist() })
    },
  })

  const removeMutation = useMutation({
    mutationFn: removeFromWatchlist,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tradingKeys.watchlist() })
    },
  })

  return {
    addToWatchlist: addMutation,
    removeFromWatchlist: removeMutation,
  }
}
