import type { Candlestick } from '../lib/api'
import type { Time } from 'lightweight-charts'

/**
 * EMA data point for chart rendering
 */
export interface EMADataPoint {
  time: Time
  value: number
}

/**
 * Calculate Exponential Moving Average (EMA) from candlestick data
 *
 * EMA formula:
 * - First EMA = SMA of first `period` values
 * - Subsequent EMA = (Close - Previous EMA) × multiplier + Previous EMA
 * - multiplier = 2 / (period + 1)
 *
 * @param data - Array of candlestick data
 * @param period - EMA period (e.g., 20 for EMA 20)
 * @returns Array of EMA data points aligned with the candlestick timestamps
 */
export function calculateEMA(data: Candlestick[], period: number): EMADataPoint[] {
  if (data.length < period) {
    return []
  }

  const result: EMADataPoint[] = []
  const multiplier = 2 / (period + 1)

  // Calculate SMA for the first EMA value
  let sum = 0
  for (let i = 0; i < period; i++) {
    sum += data[i].close
  }
  const sma = sum / period

  // First EMA point
  result.push({
    time: Math.floor(data[period - 1].openTime / 1000) as Time,
    value: sma,
  })

  // Calculate subsequent EMA values
  let prevEMA = sma
  for (let i = period; i < data.length; i++) {
    const currentClose = data[i].close
    const currentEMA = (currentClose - prevEMA) * multiplier + prevEMA

    result.push({
      time: Math.floor(data[i].openTime / 1000) as Time,
      value: currentEMA,
    })

    prevEMA = currentEMA
  }

  return result
}
