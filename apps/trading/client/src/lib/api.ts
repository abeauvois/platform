import type {
  Candlestick,
  BalanceResponse,
  MarginBalanceResponse,
  SymbolPrice,
} from '@platform/trading-domain'

// Re-export for convenience
export type { Candlestick }

/**
 * Klines API response
 */
export interface KlinesResponse {
  exchange: string
  symbol: string
  interval: string
  klines: Candlestick[]
  count: number
}

/**
 * Fetch spot wallet balances
 */
export async function fetchSpotBalances(): Promise<BalanceResponse> {
  const response = await fetch('/api/trading/balance')
  if (!response.ok) {
    throw new Error('Failed to fetch balances')
  }
  return response.json()
}

/**
 * Fetch margin account balances
 */
export async function fetchMarginBalances(): Promise<MarginBalanceResponse> {
  const response = await fetch('/api/trading/margin-balance')
  if (!response.ok) {
    throw new Error('Failed to fetch margin balances')
  }
  return response.json()
}

/**
 * Fetch current prices for multiple symbols
 */
export async function fetchPrices(symbols: string[]): Promise<SymbolPrice[]> {
  if (symbols.length === 0) return []

  const response = await fetch(`/api/trading/tickers?symbols=${symbols.join(',')}`)
  if (!response.ok) {
    throw new Error('Failed to fetch prices')
  }
  return response.json()
}

/**
 * Fetch candlestick (klines) data for charting
 */
export async function fetchKlines(params: {
  symbol: string
  interval: string
  limit: number
}): Promise<KlinesResponse> {
  const { symbol, interval, limit } = params
  const response = await fetch(
    `/api/trading/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
  )
  if (!response.ok) {
    throw new Error('Failed to fetch klines')
  }
  return response.json()
}

/**
 * Watchlist item response from API
 */
export interface WatchlistItemResponse {
  symbol: string
  price: number
  priceChangePercent24h: number | null
  addedAt: string
}

/**
 * Fetch user watchlist with prices
 */
export async function fetchWatchlist(): Promise<Array<WatchlistItemResponse>> {
  const response = await fetch('/api/trading/watchlist', {
    credentials: 'include',
  })
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Authentication required')
    }
    throw new Error('Failed to fetch watchlist')
  }
  return response.json()
}

/**
 * Add symbol to watchlist
 */
export async function addToWatchlist(symbol: string): Promise<void> {
  const response = await fetch('/api/trading/watchlist', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ symbol }),
  })
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Authentication required')
    }
    if (response.status === 400) {
      const error = await response.json()
      throw new Error(error.error || 'Symbol already in watchlist')
    }
    throw new Error('Failed to add symbol to watchlist')
  }
}

/**
 * Remove symbol from watchlist
 */
export async function removeFromWatchlist(symbol: string): Promise<void> {
  const response = await fetch(`/api/trading/watchlist/${encodeURIComponent(symbol)}`, {
    method: 'DELETE',
    credentials: 'include',
  })
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Authentication required')
    }
    if (response.status === 404) {
      throw new Error('Symbol not found in watchlist')
    }
    throw new Error('Failed to remove symbol from watchlist')
  }
}
