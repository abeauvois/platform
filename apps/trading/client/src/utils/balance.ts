// Balance types
export interface Balance {
  asset: string
  free: number
  locked: number
  total: number
}

export interface MarginBalance {
  asset: string
  free: number
  locked: number
  borrowed: number
  interest: number
  netAsset: number
}

export interface BalanceResponse {
  exchange: string
  balances: Balance[]
  count: number
}

export interface MarginBalanceResponse {
  exchange: string
  balances: MarginBalance[]
  count: number
}

export interface SymbolPrice {
  symbol: string
  price: number
}

// Constants
export const MIN_USD_VALUE_FILTER = 20
export const STABLECOINS = new Set(['USDT', 'USDC', 'BUSD'])

/**
 * Convert asset name to tradeable symbol.
 * LD prefix = Binance Flexible Savings tokens (e.g., LDBTC -> BTC)
 */
export function getTradableSymbol(asset: string): string {
  if (asset.startsWith('LD')) {
    return asset.slice(2)
  }
  return asset
}

/**
 * Calculate USD value for an asset given its amount and price map.
 * Stablecoins (USDT, USDC, BUSD) are treated as 1:1 with USD.
 */
export function getUsdValue(
  asset: string,
  amount: number,
  prices: Map<string, number>
): number | null {
  const tradable = getTradableSymbol(asset)

  // Stablecoins are already in USD
  if (STABLECOINS.has(tradable)) {
    return amount
  }

  // Find price for this asset
  const price = prices.get(`${tradable}USDT`)
  if (price === undefined) return null

  return amount * price
}

/**
 * Format a number as USD currency.
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price)
}

/**
 * Format a balance amount with appropriate decimal places.
 */
export function formatBalance(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 8,
  }).format(amount)
}
