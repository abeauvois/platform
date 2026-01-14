/**
 * Symbol parsing utilities for trading pairs
 */

/** Supported quote assets for trading pairs */
export const QUOTE_ASSETS = ['USDT', 'USDC'] as const

/** Regex pattern for extracting base asset from trading symbol */
const QUOTE_ASSET_PATTERN = new RegExp(`(${QUOTE_ASSETS.join('|')})$`)

/**
 * Extract base asset from a trading symbol
 * @param symbol - Trading pair symbol (e.g., 'BTCUSDT')
 * @returns Base asset (e.g., 'BTC')
 */
export function extractBaseAsset(symbol: string): string {
  return symbol.replace(QUOTE_ASSET_PATTERN, '')
}

/**
 * Build a trading symbol from base and quote assets
 * @param baseAsset - Base asset (e.g., 'BTC')
 * @param quoteAsset - Quote asset (e.g., 'USDT')
 * @returns Trading symbol (e.g., 'BTCUSDT')
 */
export function buildTradingSymbol(baseAsset: string, quoteAsset: string): string {
  return `${baseAsset}${quoteAsset}`
}
