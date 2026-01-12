import type { Candlestick, SwingDetectionConfig, SwingPoint } from '../types.js'

/**
 * Detect swing points using the N-bar pivot method
 *
 * Swing High: A candle where N candles on each side have strictly lower highs
 * Swing Low: A candle where N candles on each side have strictly higher lows
 *
 * @param data - Array of candlestick data
 * @param config - Configuration specifying lookback bars
 * @returns Array of detected swing points sorted by time
 */
export function detectSwingPoints(
  data: Array<Candlestick>,
  config: SwingDetectionConfig
): Array<SwingPoint> {
  const { lookbackBars } = config
  const minRequired = lookbackBars * 2 + 1

  if (data.length < minRequired) {
    return []
  }

  const swingPoints: Array<SwingPoint> = []

  // Iterate through candles that have enough bars on each side
  for (let i = lookbackBars; i < data.length - lookbackBars; i++) {
    const currentCandle = data[i]
    const currentHigh = currentCandle.high
    const currentLow = currentCandle.low

    // Check for swing high
    let isSwingHigh = true
    for (let j = 1; j <= lookbackBars; j++) {
      const leftHigh = data[i - j].high
      const rightHigh = data[i + j].high

      // Must be strictly greater than all neighbors
      if (currentHigh <= leftHigh || currentHigh <= rightHigh) {
        isSwingHigh = false
        break
      }
    }

    if (isSwingHigh) {
      swingPoints.push({
        time: Math.floor(currentCandle.openTime / 1000),
        price: currentHigh,
        type: 'high',
        index: i,
      })
    }

    // Check for swing low
    let isSwingLow = true
    for (let j = 1; j <= lookbackBars; j++) {
      const leftLow = data[i - j].low
      const rightLow = data[i + j].low

      // Must be strictly less than all neighbors
      if (currentLow >= leftLow || currentLow >= rightLow) {
        isSwingLow = false
        break
      }
    }

    if (isSwingLow) {
      swingPoints.push({
        time: Math.floor(currentCandle.openTime / 1000),
        price: currentLow,
        type: 'low',
        index: i,
      })
    }
  }

  // Sort by time (should already be sorted, but ensure it)
  swingPoints.sort((a, b) => a.time - b.time)

  return swingPoints
}
