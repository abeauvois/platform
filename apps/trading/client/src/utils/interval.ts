/**
 * Interval parsing utilities for trading charts
 */

const INTERVAL_MULTIPLIERS: Record<string, number> = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
    w: 604800,
    M: 2592000,
}

const DEFAULT_INTERVAL_SECONDS = 3600 // 1 hour

/**
 * Parse interval string to seconds
 * @param interval - Interval string (e.g., '1m', '1h', '1d')
 * @returns Interval in seconds
 *
 * @example
 * parseIntervalToSeconds('1m')  // 60
 * parseIntervalToSeconds('1h')  // 3600
 * parseIntervalToSeconds('1d')  // 86400
 * parseIntervalToSeconds('1w')  // 604800
 * parseIntervalToSeconds('1M')  // 2592000
 */
export function parseIntervalToSeconds(interval: string): number {
    const unit = interval.slice(-1)
    const value = parseInt(interval.slice(0, -1), 10)

    const multiplier = INTERVAL_MULTIPLIERS[unit]
    if (multiplier === undefined) {
        return DEFAULT_INTERVAL_SECONDS
    }

    return value * multiplier
}
