import { useQuery } from '@tanstack/react-query'

import { tradingKeys } from '../lib/query-keys'

export interface FetchedOrder {
  id: string
  symbol: string
  side: 'buy' | 'sell'
  type: 'market' | 'limit' | 'stop' | 'stop_limit'
  quantity: number
  price?: number
  status: 'pending' | 'filled' | 'partially_filled' | 'cancelled' | 'rejected'
  filledQuantity: number
  createdAt: string
  updatedAt: string
}

async function fetchOrders(symbol?: string): Promise<FetchedOrder[]> {
  const url = symbol ? `/api/trading/order?symbol=${encodeURIComponent(symbol)}` : '/api/trading/order'

  const response = await fetch(url, {
    credentials: 'include', // Send session cookies
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch orders' }))
    throw new Error(error.message || error.error || 'Failed to fetch orders')
  }

  return response.json()
}

/**
 * Hook to fetch open orders from the API
 *
 * @param symbol - Optional trading pair to filter orders (e.g., 'BTCUSDT')
 * @param enabled - Whether to enable the query (default: true, should be false when not authenticated)
 * @returns Query result with orders array
 */
export function useFetchOrders(symbol?: string, enabled = true) {
  return useQuery({
    queryKey: tradingKeys.orders(),
    queryFn: () => fetchOrders(symbol),
    staleTime: 30_000, // Consider data stale after 30 seconds
    refetchInterval: 60_000, // Refetch every minute as backup
    enabled, // Only fetch when authenticated
  })
}
