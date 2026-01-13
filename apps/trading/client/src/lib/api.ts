import type {
  Candlestick,
  BalanceResponse,
  MarginBalanceResponse,
  MaxBorrowable,
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
 * Fetch maximum borrowable amount for an asset in cross margin account
 * Used for determining available leverage for BUY (borrow quote) or SELL (short/borrow base)
 */
export async function fetchMaxBorrowable(asset: string): Promise<MaxBorrowable> {
  const response = await fetch(`/api/trading/margin-balance/max-borrowable?asset=${encodeURIComponent(asset)}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch max borrowable for ${asset}`)
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

/**
 * Symbol search result from API
 */
export interface SymbolSearchResult {
  symbol: string
  baseAsset: string
  price: number
  priceChangePercent24h: number
}

/**
 * Fetch tradable symbols with prices for search
 */
export async function fetchSymbols(params?: {
  quoteAsset?: string
  withPrices?: boolean
}): Promise<Array<SymbolSearchResult>> {
  const searchParams = new URLSearchParams()
  if (params?.quoteAsset) searchParams.set('quoteAsset', params.quoteAsset)
  if (params?.withPrices) searchParams.set('withPrices', 'true')

  const url = `/api/trading/symbols${searchParams.toString() ? `?${searchParams}` : ''}`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Failed to fetch symbols')
  }
  return response.json()
}

/**
 * Account mode for trading orders
 */
export type AccountMode = 'spot' | 'margin'

/**
 * User trading settings response from API
 */
export interface UserTradingSettingsResponse {
  defaultAccountMode: AccountMode
  createdAt: string
  updatedAt: string
}

/**
 * Fetch user trading settings
 */
export async function fetchUserSettings(): Promise<UserTradingSettingsResponse> {
  const response = await fetch('/api/trading/settings', {
    credentials: 'include',
  })
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Authentication required')
    }
    throw new Error('Failed to fetch settings')
  }
  return response.json()
}

/**
 * Update user trading settings
 */
export async function updateUserSettings(data: {
  defaultAccountMode?: AccountMode
}): Promise<UserTradingSettingsResponse> {
  const response = await fetch('/api/trading/settings', {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Authentication required')
    }
    throw new Error('Failed to update settings')
  }
  return response.json()
}
