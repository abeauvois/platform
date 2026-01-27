/**
 * Hook for fetching margin availability (max borrowable amounts)
 *
 * Used to determine if user can place leveraged orders:
 * - BUY: Check maxBorrowable for quote asset (e.g., USDC)
 * - SELL: Check maxBorrowable for base asset (e.g., BTC) for short selling
 */

import { useQuery } from '@tanstack/react-query'
import { fetchMaxBorrowable } from '../lib/api'
import type { MaxBorrowable } from '@abeauvois/platform-trading-domain'

export interface UseMarginAvailabilityConfig {
  /** Base asset symbol (e.g., 'BTC') */
  baseAsset: string
  /** Quote asset symbol (e.g., 'USDC') */
  quoteAsset: string
  /** Whether user is authenticated (required for API calls) */
  isAuthenticated: boolean
  /** Current account mode - only fetch when in margin mode */
  accountMode: 'spot' | 'margin'
}

export interface UseMarginAvailabilityReturn {
  /** Max borrowable for base asset (for short selling) */
  maxBorrowableBase: number
  /** Max borrowable for quote asset (for leveraged buying) */
  maxBorrowableQuote: number
  /** Full max borrowable data for base asset */
  baseData: MaxBorrowable | undefined
  /** Full max borrowable data for quote asset */
  quoteData: MaxBorrowable | undefined
  /** Whether data is loading */
  isLoading: boolean
  /** Error if any */
  error: Error | null
}

/**
 * Hook to fetch margin availability for trading pair
 * Only fetches when authenticated and in margin mode
 */
export function useMarginAvailability(config: UseMarginAvailabilityConfig): UseMarginAvailabilityReturn {
  const { baseAsset, quoteAsset, isAuthenticated, accountMode } = config

  // Only fetch when authenticated AND in margin mode
  const shouldFetch = isAuthenticated && accountMode === 'margin'

  // Fetch max borrowable for base asset (for SELL/short)
  const {
    data: baseData,
    isLoading: baseLoading,
    error: baseError,
  } = useQuery({
    queryKey: ['maxBorrowable', baseAsset],
    queryFn: () => fetchMaxBorrowable(baseAsset),
    enabled: shouldFetch && !!baseAsset,
    staleTime: 30 * 1000, // 30 seconds - margin availability can change
    retry: false, // Don't retry on failure (e.g., asset not borrowable)
  })

  // Fetch max borrowable for quote asset (for BUY/leverage)
  const {
    data: quoteData,
    isLoading: quoteLoading,
    error: quoteError,
  } = useQuery({
    queryKey: ['maxBorrowable', quoteAsset],
    queryFn: () => fetchMaxBorrowable(quoteAsset),
    enabled: shouldFetch && !!quoteAsset,
    staleTime: 30 * 1000, // 30 seconds
    retry: false,
  })

  return {
    maxBorrowableBase: baseData?.amount ?? 0,
    maxBorrowableQuote: quoteData?.amount ?? 0,
    baseData,
    quoteData,
    isLoading: baseLoading || quoteLoading,
    error: baseError || quoteError,
  }
}
