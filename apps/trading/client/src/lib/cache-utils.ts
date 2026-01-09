import type { QueryClient } from '@tanstack/react-query'
import { tradingKeys } from './query-keys'

/**
 * Invalidate all trading-related queries
 * Use for full app refresh
 */
export function invalidateAllTradingData(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: tradingKeys.all })
}

/**
 * Invalidate balance-related queries (spot + margin)
 */
export function invalidateBalances(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: tradingKeys.balances() })
}

/**
 * Invalidate price queries
 */
export function invalidatePrices(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: tradingKeys.prices() })
}

/**
 * Invalidate klines (chart) data
 */
export function invalidateKlines(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: tradingKeys.klines() })
}

/**
 * Invalidate order-related queries
 */
export function invalidateOrders(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: tradingKeys.orders() })
}

/**
 * Called after order creation/fill - refreshes balances and orders
 */
export function onOrderCompleted(queryClient: QueryClient) {
  invalidateBalances(queryClient)
  invalidateOrders(queryClient)
}
