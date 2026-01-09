import { useQuery } from '@tanstack/react-query'

import { REFETCH_INTERVAL } from '../lib/constants'
import { tradingKeys } from '../lib/query-keys'

export interface FilledOrder {
  id: string
  symbol: string
  side: 'buy' | 'sell'
  type: 'market' | 'limit' | 'stop' | 'stop_limit' | 'stop_loss' | 'stop_loss_limit' | 'take_profit' | 'take_profit_limit'
  quantity: number
  price?: number
  status: 'filled'
  filledQuantity: number
  createdAt: string
  updatedAt: string
}

async function fetchOrderHistory(symbol: string, limit: number = 50): Promise<Array<FilledOrder>> {
  const url = `/api/trading/order/history?symbol=${encodeURIComponent(symbol)}&limit=${limit}`

  const response = await fetch(url, {
    credentials: 'include', // Send session cookies
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch order history' }))
    throw new Error(error.message || error.error || 'Failed to fetch order history')
  }

  return response.json()
}

/**
 * Hook to fetch order history (filled orders) from the API
 *
 * @param symbol - Trading pair to fetch history for (e.g., 'BTCUSDT')
 * @param enabled - Whether to enable the query (default: true, should be false when not authenticated)
 * @param limit - Maximum number of orders to fetch (default: 50)
 * @returns Query result with order history array
 */
export function useFetchOrderHistory(symbol: string, enabled = true, limit = 50) {
  return useQuery({
    queryKey: tradingKeys.orderHistory(symbol),
    queryFn: () => fetchOrderHistory(symbol, limit),
    staleTime: 60_000, // Consider data stale after 1 minute (historical data changes less frequently)
    refetchInterval: REFETCH_INTERVAL,
    enabled: enabled && Boolean(symbol), // Only fetch when authenticated and symbol is provided
  })
}
