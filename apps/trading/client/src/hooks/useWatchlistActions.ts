import { useCallback, useMemo } from 'react'
import { useWatchlist } from './queries'
import { useWatchlistMutations } from './useWatchlistMutations'
import { extractBaseAsset } from '../utils/symbol'

import type { AssetSource } from './useSelectedAsset'

/**
 * Consolidated hook for all watchlist-related actions and state
 * Reduces boilerplate in components using watchlist functionality
 */
export function useWatchlistActions(
  tradingSymbol: string,
  isAuthenticated: boolean,
  onAssetSelect: (asset: string, source?: AssetSource) => void
) {
  const {
    data: watchlistData,
    isLoading: isWatchlistLoading,
    error: watchlistError,
    refetch: refetchWatchlist,
  } = useWatchlist(isAuthenticated)

  const { addToWatchlist, removeFromWatchlist } = useWatchlistMutations()

  const isInWatchlist = useMemo(() => {
    if (!watchlistData) return false
    return watchlistData.some((item) => item.symbol === tradingSymbol)
  }, [watchlistData, tradingSymbol])

  const handleAddToWatchlist = useCallback(() => {
    if (!isInWatchlist) {
      addToWatchlist.mutate(tradingSymbol)
    }
  }, [addToWatchlist, tradingSymbol, isInWatchlist])

  const handleWatchlistSelect = useCallback(
    (symbol: string) => {
      const baseAsset = extractBaseAsset(symbol)
      onAssetSelect(baseAsset, 'watchlist')
    },
    [onAssetSelect]
  )

  const handleWatchlistRemove = useCallback(
    (symbol: string) => {
      removeFromWatchlist.mutate(symbol)
    },
    [removeFromWatchlist]
  )

  return {
    watchlistData: watchlistData ?? [],
    isWatchlistLoading,
    watchlistError: watchlistError ?? null,
    refetchWatchlist,
    isInWatchlist,
    handleAddToWatchlist: isAuthenticated ? handleAddToWatchlist : undefined,
    handleWatchlistSelect,
    handleWatchlistRemove,
  }
}
