/**
 * Stop Order Type Detection Utility
 *
 * Determines the correct Binance order type (STOP_LOSS vs TAKE_PROFIT)
 * based on the side and stop price relative to current market price.
 *
 * Logic:
 * - BUY above current price = STOP_LOSS (triggered when price rises)
 * - BUY below current price = TAKE_PROFIT (triggered when price drops)
 * - SELL above current price = TAKE_PROFIT (triggered when price rises)
 * - SELL below current price = STOP_LOSS (triggered when price drops)
 */

export type StopOrderCategory = 'stop_loss' | 'take_profit'

/**
 * Detect whether a stop order should be STOP_LOSS or TAKE_PROFIT
 * based on the order side and price position relative to current market price.
 *
 * @param side - Order side ('buy' or 'sell')
 * @param stopPrice - The stop/trigger price for the order
 * @param currentPrice - Current market price
 * @returns The stop order category
 */
export function detectStopOrderCategory(
  side: 'buy' | 'sell',
  stopPrice: number,
  currentPrice: number
): StopOrderCategory {
  if (side === 'buy') {
    // BUY above current = STOP_LOSS (enter when price breaks resistance)
    // BUY below current = TAKE_PROFIT (enter when price drops to support)
    return stopPrice >= currentPrice ? 'stop_loss' : 'take_profit'
  }

  // SELL above current = TAKE_PROFIT (exit when price reaches target)
  // SELL below current = STOP_LOSS (exit to limit losses)
  return stopPrice > currentPrice ? 'take_profit' : 'stop_loss'
}

/**
 * Get the Binance API order type string for a stop order.
 *
 * @param category - The stop order category (stop_loss or take_profit)
 * @param isLimit - Whether this is a limit order (true) or market order (false)
 * @returns The Binance API order type string
 */
export function getBinanceOrderType(
  category: StopOrderCategory,
  isLimit: boolean
): string {
  if (category === 'stop_loss') {
    return isLimit ? 'STOP_LOSS_LIMIT' : 'STOP_LOSS'
  }
  return isLimit ? 'TAKE_PROFIT_LIMIT' : 'TAKE_PROFIT'
}
