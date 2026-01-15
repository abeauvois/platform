import type {
  Candlestick,
  EMADataPoint,
  SwingPoint,
  TrendLine,
  TrendLineConfig,
  TrendLineResult,
} from '../types.js'
import { detectSwingPoints } from './swingPoints.js'

/**
 * Generate trend lines from swing points
 *
 * - Connect swing lows to form ascending support lines (higher lows)
 * - Connect swing highs to form descending resistance lines (lower highs)
 * - Deduplicates lines to ensure only one line per starting point
 * - Deduplicates lines to ensure only one line per ending point (keeps newest)
 *
 * @param swingPoints - Array of detected swing points
 * @param config - Configuration for trend line generation
 * @returns Object containing support and resistance lines
 */
export function generateTrendLines(
  swingPoints: Array<SwingPoint>,
  config: TrendLineConfig
): { supportLines: Array<TrendLine>; resistanceLines: Array<TrendLine> } {
  // Separate swing highs and lows
  const swingLows = swingPoints
    .filter((p) => p.type === 'low')
    .sort((a, b) => a.time - b.time)
  const swingHighs = swingPoints
    .filter((p) => p.type === 'high')
    .sort((a, b) => a.time - b.time)

  // Generate ascending support lines from swing lows
  // Use a Map to keep only one line per starting point (the one with most recent end)
  const supportByStartIndex = new Map<number, TrendLine>()

  for (let i = 0; i < swingLows.length - 1; i++) {
    for (let j = i + 1; j < swingLows.length; j++) {
      const start = swingLows[i]
      const end = swingLows[j]

      // Only create support line if it's ascending (higher low)
      if (end.price > start.price) {
        const timeDelta = end.time - start.time
        const slope = timeDelta > 0 ? (end.price - start.price) / timeDelta : 0

        const newLine: TrendLine = {
          id: `support-${start.index}-${end.index}`,
          startPoint: start,
          endPoint: end,
          type: 'support',
          slope,
          isBroken: false,
        }

        // Keep line with most recent end point for each start point
        const existing = supportByStartIndex.get(start.index)
        if (!existing || end.time > existing.endPoint.time) {
          supportByStartIndex.set(start.index, newLine)
        }
      }
    }
  }

  // Generate descending resistance lines from swing highs
  // Use a Map to keep only one line per starting point (the one with most recent end)
  const resistanceByStartIndex = new Map<number, TrendLine>()

  for (let i = 0; i < swingHighs.length - 1; i++) {
    for (let j = i + 1; j < swingHighs.length; j++) {
      const start = swingHighs[i]
      const end = swingHighs[j]

      // Only create resistance line if it's descending (lower high)
      if (end.price < start.price) {
        const timeDelta = end.time - start.time
        const slope = timeDelta > 0 ? (end.price - start.price) / timeDelta : 0

        const newLine: TrendLine = {
          id: `resistance-${start.index}-${end.index}`,
          startPoint: start,
          endPoint: end,
          type: 'resistance',
          slope,
          isBroken: false,
        }

        // Keep line with most recent end point for each start point
        const existing = resistanceByStartIndex.get(start.index)
        if (!existing || end.time > existing.endPoint.time) {
          resistanceByStartIndex.set(start.index, newLine)
        }
      }
    }
  }

  // Deduplicate by end point: keep only the newest line (most recent start) for each end point
  const deduplicateByEndPoint = (
    lines: Array<TrendLine>
  ): Array<TrendLine> => {
    const byEndIndex = new Map<number, TrendLine>()
    for (const line of lines) {
      const existing = byEndIndex.get(line.endPoint.index)
      // Keep the line with the most recent start point
      if (!existing || line.startPoint.time > existing.startPoint.time) {
        byEndIndex.set(line.endPoint.index, line)
      }
    }
    return Array.from(byEndIndex.values())
  }

  const supportLines = deduplicateByEndPoint(
    Array.from(supportByStartIndex.values())
  )
  const resistanceLines = deduplicateByEndPoint(
    Array.from(resistanceByStartIndex.values())
  )

  // Sort by recency (most recent end point first) and limit to maxLines
  const sortByRecency = (a: TrendLine, b: TrendLine) =>
    b.endPoint.time - a.endPoint.time

  return {
    supportLines: supportLines.sort(sortByRecency).slice(0, config.maxLines),
    resistanceLines: resistanceLines
      .sort(sortByRecency)
      .slice(0, config.maxLines),
  }
}

/**
 * Calculate the price value on a trend line at a given time
 *
 * Uses linear interpolation/extrapolation based on the line's slope
 *
 * @param trendLine - The trend line
 * @param time - Unix timestamp in seconds
 * @returns Price at the given time
 */
export function getPriceAtTime(trendLine: TrendLine, time: number): number {
  const timeDelta = time - trendLine.startPoint.time
  return trendLine.startPoint.price + trendLine.slope * timeDelta
}

/**
 * Check if a trend line is broken by EMA data
 *
 * A support line is broken when the EMA crosses below it
 * A resistance line is broken when the EMA crosses above it
 *
 * @param trendLine - The trend line to check
 * @param emaData - Array of EMA data points
 * @returns true if the line is broken, false otherwise
 */
export function checkTrendLineBreak(
  trendLine: TrendLine,
  emaData: Array<EMADataPoint>
): boolean {
  if (emaData.length < 2) {
    return false
  }

  // Filter EMA data to points within or after the trend line start
  const relevantEma = emaData.filter((e) => e.time >= trendLine.startPoint.time)

  if (relevantEma.length < 2) {
    return false
  }

  // Check for crossings
  for (let i = 1; i < relevantEma.length; i++) {
    const prevEma = relevantEma[i - 1]
    const currEma = relevantEma[i]

    const prevLinePrice = getPriceAtTime(trendLine, prevEma.time)
    const currLinePrice = getPriceAtTime(trendLine, currEma.time)

    if (trendLine.type === 'support') {
      // Support is broken when EMA crosses from above to below
      const prevAbove = prevEma.value >= prevLinePrice
      const currBelow = currEma.value < currLinePrice

      if (prevAbove && currBelow) {
        return true
      }
    } else {
      // Resistance is broken when EMA crosses from below to above
      const prevBelow = prevEma.value <= prevLinePrice
      const currAbove = currEma.value > currLinePrice

      if (prevBelow && currAbove) {
        return true
      }
    }
  }

  return false
}

/**
 * Full detection pipeline combining all steps
 *
 * 1. Detect swing points from candlestick data
 * 2. Generate trend lines from swing points
 * 3. Check each line for EMA breaks
 *
 * @param candlesticks - Array of candlestick data
 * @param emaData - Array of EMA data points for break detection
 * @param config - Configuration for detection
 * @returns Complete result with support lines, resistance lines, and swing points
 */
export function detectTrendLines(
  candlesticks: Array<Candlestick>,
  emaData: Array<EMADataPoint>,
  config: TrendLineConfig
): TrendLineResult {
  // Step 1: Detect swing points
  const swingPoints = detectSwingPoints(candlesticks, config.swingConfig)

  // Step 2: Generate trend lines
  const { supportLines, resistanceLines } = generateTrendLines(
    swingPoints,
    config
  )

  // Step 3: Check for EMA breaks and update isBroken flag
  const checkedSupportLines = supportLines.map((line) => ({
    ...line,
    isBroken: checkTrendLineBreak(line, emaData),
  }))

  const checkedResistanceLines = resistanceLines.map((line) => ({
    ...line,
    isBroken: checkTrendLineBreak(line, emaData),
  }))

  return {
    supportLines: checkedSupportLines,
    resistanceLines: checkedResistanceLines,
    swingPoints,
  }
}
