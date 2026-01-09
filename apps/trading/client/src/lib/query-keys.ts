/**
 * Centralized query key factory for TanStack Query
 *
 * This provides type-safe, consistent query keys across the trading app.
 * Using a factory pattern allows for:
 * - Type inference for query keys
 * - Easy invalidation of related queries
 * - Consistent naming conventions
 */
export const tradingKeys = {
  // Root key for all trading-related queries
  all: ['trading'] as const,

  // Balance queries
  balances: () => [...tradingKeys.all, 'balances'] as const,
  spotBalances: () => [...tradingKeys.balances(), 'spot'] as const,
  marginBalances: () => [...tradingKeys.balances(), 'margin'] as const,

  // Price queries
  prices: () => [...tradingKeys.all, 'prices'] as const,
  pricesBySymbols: (symbols: string[]) => [...tradingKeys.prices(), symbols] as const,

  // Klines (candlestick chart data)
  klines: () => [...tradingKeys.all, 'klines'] as const,
  klinesByParams: (params: { symbol: string; interval: string; limit: number }) =>
    [...tradingKeys.klines(), params] as const,

  // Order queries
  orders: () => [...tradingKeys.all, 'orders'] as const,
  orderById: (id: string) => [...tradingKeys.orders(), id] as const,

  // Order history queries
  orderHistory: (symbol: string) => [...tradingKeys.all, 'order-history', symbol] as const,

  // Watchlist queries
  watchlist: () => [...tradingKeys.all, 'watchlist'] as const,
}
