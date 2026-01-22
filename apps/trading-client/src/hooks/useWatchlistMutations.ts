import { useMutation, useQueryClient } from '@tanstack/react-query'
import { tradingKeys } from '../lib/query-keys'
import { addToWatchlist, removeFromWatchlist, updateUserSettings } from '../lib/api'

/**
 * Hook for watchlist add/remove mutations with cache invalidation
 * Also provides global reference timestamp update via user settings
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

  // Global reference timestamp is now stored in user settings
  // This updates the global reference for ALL watchlist items
  const updateGlobalReferenceMutation = useMutation({
    mutationFn: (timestamp: number | null) =>
      updateUserSettings({ globalReferenceTimestamp: timestamp }),
    onSuccess: () => {
      // Invalidate both settings and watchlist since watchlist uses the global reference
      queryClient.invalidateQueries({ queryKey: ['userTradingSettings'] })
      queryClient.invalidateQueries({ queryKey: tradingKeys.watchlist() })
    },
  })

  return {
    addToWatchlist: addMutation,
    removeFromWatchlist: removeMutation,
    updateGlobalReference: updateGlobalReferenceMutation,
  }
}
