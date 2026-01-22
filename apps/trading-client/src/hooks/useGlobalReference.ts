/**
 * Hook for managing global reference timestamp state
 *
 * The global reference timestamp is used to calculate price variations
 * for all watchlist items from a single reference point in time.
 * It's stored in user settings and persists across sessions.
 */

import { useCallback, useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchUserSettings, updateUserSettings } from '../lib/api'
import { tradingKeys } from '../lib/query-keys'

export interface UseGlobalReferenceReturn {
  /** Current global reference timestamp (Unix ms) or null if not set */
  globalReferenceTimestamp: number | null
  /** Set the global reference timestamp */
  setGlobalReference: (timestamp: number | null) => void
  /** Clear the global reference (sets to null) */
  clearGlobalReference: () => void
  /** Whether settings are loading */
  isLoading: boolean
}

/**
 * Hook to manage global reference timestamp
 * Syncs with server-side user settings for persistence
 * Uses local state to prevent flickering during refetches
 *
 * @param isAuthenticated - Whether user is authenticated (required for API calls)
 */
export function useGlobalReference(isAuthenticated: boolean): UseGlobalReferenceReturn {
  const queryClient = useQueryClient()
  const [localTimestamp, setLocalTimestamp] = useState<number | null>(null)

  // Fetch user settings from platform API
  const { data: settings, isLoading } = useQuery({
    queryKey: ['userSettings'],
    queryFn: fetchUserSettings,
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Update server settings mutation with optimistic update
  const updateMutation = useMutation({
    mutationFn: updateUserSettings,
    onMutate: async (newData) => {
      // Optimistically update local state immediately
      if ('tradingReferenceTimestamp' in newData) {
        setLocalTimestamp(newData.tradingReferenceTimestamp ?? null)
      }
    },
    onSuccess: () => {
      // Invalidate queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ['userSettings'] })
      queryClient.invalidateQueries({ queryKey: tradingKeys.watchlist() })
    },
    onError: (_err, _newData, _context) => {
      // On error, sync back from server settings
      if (settings?.tradingReferenceTimestamp !== undefined) {
        setLocalTimestamp(settings.tradingReferenceTimestamp)
      }
    },
  })

  // Sync local state with server settings when loaded
  useEffect(() => {
    if (settings?.tradingReferenceTimestamp !== undefined) {
      setLocalTimestamp(settings.tradingReferenceTimestamp)
    }
  }, [settings?.tradingReferenceTimestamp])

  // Set global reference and persist to server
  const setGlobalReference = useCallback(
    (timestamp: number | null) => {
      // Update local state immediately for instant UI feedback
      setLocalTimestamp(timestamp)
      // Persist to server if authenticated
      if (isAuthenticated) {
        updateMutation.mutate({ tradingReferenceTimestamp: timestamp })
      }
    },
    [isAuthenticated, updateMutation]
  )

  // Clear the global reference
  const clearGlobalReference = useCallback(() => {
    setGlobalReference(null)
  }, [setGlobalReference])

  return {
    globalReferenceTimestamp: localTimestamp,
    setGlobalReference,
    clearGlobalReference,
    isLoading,
  }
}
