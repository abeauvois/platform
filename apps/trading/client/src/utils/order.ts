/**
 * Order utility functions for precision and validation
 */

/**
 * Round a number to a specific number of decimal places
 */
export function roundToPrecision(value: number, decimals: number): number {
  const multiplier = 10 ** decimals
  return Math.round(value * multiplier) / multiplier
}

/**
 * Get price precision based on Binance tick sizes:
 * - Most pairs (SOL, ETH, etc.): 2 decimals (tick 0.01)
 * - BTC pairs: 2 decimals (tick 0.01)
 * - Low value assets: 4 decimals
 * - Very low value: 6 decimals
 */
export function getPricePrecision(price: number): number {
  if (price >= 1) return 2
  if (price >= 0.01) return 4
  return 6
}

/**
 * Get quantity precision based on asset value:
 * - BTC-like (high value): 5 decimals (step 0.00001)
 * - Mid-value assets: 2 decimals
 * - Lower value: 1 decimal
 */
export function getQuantityPrecision(price: number): number {
  if (price >= 10000) return 5
  if (price >= 100) return 2
  return 1
}

interface ValidationResult {
  valid: boolean
  error?: string
}

/**
 * Validate order value against maximum limit
 */
export function validateOrderValue(
  quantity: number,
  price: number,
  maxValue: number
): ValidationResult {
  if (quantity <= 0) {
    return {
      valid: false,
      error: 'Order amount must be greater than 0',
    }
  }

  const orderValue = quantity * price
  if (orderValue > maxValue) {
    return {
      valid: false,
      error: `Order value $${orderValue.toFixed(2)} exceeds limit of $${maxValue}. Please reduce the amount.`,
    }
  }

  return { valid: true }
}

/**
 * Validate that sufficient balance is available
 */
export function validateBalance(
  amount: number,
  available: number,
  asset: string,
  locked?: number
): ValidationResult {
  if (amount > available) {
    const lockedMsg = locked && locked > 0 ? ` (${locked} locked in orders)` : ''
    return {
      valid: false,
      error: `Insufficient ${asset} balance.\nNeed: ${amount} ${asset}\nAvailable: ${available} ${asset}${lockedMsg}\n\nCancel existing orders to free up funds.`,
    }
  }

  return { valid: true }
}
