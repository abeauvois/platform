import type {
  BalanceResponse,
  MarginBalanceResponse,
  SymbolPrice,
} from '../utils/balance'

/**
 * Candlestick data for charting
 */
export interface Candlestick {
  openTime: number
  open: number
  high: number
  low: number
  close: number
  volume: number
  closeTime: number
}

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
