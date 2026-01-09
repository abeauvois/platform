/**
 * Price Formatting Utilities
 * Handles precision calculation and formatting for cryptocurrency prices
 */

/**
 * Calculate the appropriate number of decimal places for a price value.
 * For prices >= 1, uses 2 decimals. For prices < 1, calculates based on magnitude.
 *
 * Examples:
 * - 45000 → 2 (displays as 45000.00)
 * - 0.5 → 4 (displays as 0.5000)
 * - 0.003921 → 6 (displays as 0.003921)
 * - 0.00001234 → 8 (displays as 0.00001234)
 */
export function calculatePricePrecision(price: number): number {
    if (price === 0) return 2
    if (price >= 1) return 2
    // For prices < 1, count significant digits needed
    const absPrice = Math.abs(price)
    const logValue = Math.floor(Math.log10(absPrice))
    // Need enough decimals to show the price + 2 significant digits
    return Math.max(2, Math.abs(logValue) + 2)
}

/**
 * Format a price with appropriate precision based on its magnitude.
 * Optionally accepts a custom precision override.
 *
 * @param price - The price value to format
 * @param precision - Optional precision override (if not provided, calculates automatically)
 * @returns Formatted price string
 */
export function formatPrice(price: number, precision?: number): string {
    const p = precision ?? calculatePricePrecision(price)
    return price.toFixed(p)
}

/**
 * Get the minimum price movement (tick size) for a given precision.
 *
 * @param precision - Number of decimal places
 * @returns The minimum price movement value
 */
export function getMinMove(precision: number): number {
    return 1 / Math.pow(10, precision)
}
