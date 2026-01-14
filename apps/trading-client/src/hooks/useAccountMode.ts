/**
 * Hook for managing account mode state (spot vs margin)
 *
 * Account modes:
 * - 'spot': Default - orders are placed on spot wallet
 * - 'margin': Orders are placed on margin account
 */

import { useCallback, useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchUserSettings, updateUserSettings, type AccountMode } from '../lib/api'

export type { AccountMode }

export interface UseAccountModeReturn {
  /** Current account mode */
  accountMode: AccountMode
  /** Set the account mode (updates both local state and server settings) */
  setAccountMode: (mode: AccountMode) => void
  /** Convenience check for margin mode */
  isMarginMode: boolean
  /** Whether settings are loading */
  isLoading: boolean
}

/**
 * Hook to manage account mode state (spot vs margin)
 * Syncs with server-side user settings for persistence
 * @param isAuthenticated - Whether user is authenticated (required for API calls)
 */
export function useAccountMode(isAuthenticated: boolean): UseAccountModeReturn {
  const queryClient = useQueryClient()
  const [accountMode, setLocalAccountMode] = useState<AccountMode>('spot')

  // Fetch user settings from server
  const { data: settings, isLoading } = useQuery({
    queryKey: ['userTradingSettings'],
    queryFn: fetchUserSettings,
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Update server settings mutation
  const updateMutation = useMutation({
    mutationFn: updateUserSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userTradingSettings'] })
    },
  })

  // Sync local state with server settings when loaded
  useEffect(() => {
    if (settings?.defaultAccountMode) {
      setLocalAccountMode(settings.defaultAccountMode)
    }
  }, [settings?.defaultAccountMode])

  // Set account mode and persist to server
  const setAccountMode = useCallback(
    (mode: AccountMode) => {
      setLocalAccountMode(mode)
      // Only persist to server if authenticated
      if (isAuthenticated) {
        updateMutation.mutate({ defaultAccountMode: mode })
      }
    },
    [isAuthenticated, updateMutation]
  )

  return {
    accountMode,
    setAccountMode,
    isMarginMode: accountMode === 'margin',
    isLoading,
  }
}
