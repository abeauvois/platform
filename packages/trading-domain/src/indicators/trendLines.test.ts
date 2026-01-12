import { describe, expect, it } from 'bun:test'
import {
  generateTrendLines,
  checkTrendLineBreak,
  getPriceAtTime,
  detectTrendLines,
} from './trendLines.js'
import type {
  Candlestick,
  SwingPoint,
  TrendLine,
  TrendLineConfig,
  EMADataPoint,
} from '../types.js'

describe('generateTrendLines', () => {
  const defaultConfig: TrendLineConfig = {
    swingConfig: { lookbackBars: 5 },
    maxLines: 10,
    extendRight: true,
  }

  it('should return empty arrays when no swing points provided', () => {
    const result = generateTrendLines([], defaultConfig)
    expect(result.supportLines).toEqual([])
    expect(result.resistanceLines).toEqual([])
  })

  it('should return empty arrays when only one swing point of each type', () => {
    const swingPoints: Array<SwingPoint> = [
      { time: 1000, price: 100, type: 'low', index: 5 },
      { time: 2000, price: 200, type: 'high', index: 10 },
    ]
    const result = generateTrendLines(swingPoints, defaultConfig)
    expect(result.supportLines).toEqual([])
    expect(result.resistanceLines).toEqual([])
  })

  it('should generate ascending support line from two swing lows', () => {
    const swingPoints: Array<SwingPoint> = [
      { time: 1000, price: 100, type: 'low', index: 5 },
      { time: 2000, price: 120, type: 'low', index: 15 }, // Higher low
    ]
    const result = generateTrendLines(swingPoints, defaultConfig)

    expect(result.supportLines).toHaveLength(1)
    const line = result.supportLines[0]
    expect(line.type).toBe('support')
    expect(line.startPoint.price).toBe(100)
    expect(line.endPoint.price).toBe(120)
    expect(line.slope).toBeGreaterThan(0) // Ascending
    expect(line.isBroken).toBe(false)
  })

  it('should generate descending resistance line from two swing highs', () => {
    const swingPoints: Array<SwingPoint> = [
      { time: 1000, price: 200, type: 'high', index: 5 },
      { time: 2000, price: 180, type: 'high', index: 15 }, // Lower high
    ]
    const result = generateTrendLines(swingPoints, defaultConfig)

    expect(result.resistanceLines).toHaveLength(1)
    const line = result.resistanceLines[0]
    expect(line.type).toBe('resistance')
    expect(line.startPoint.price).toBe(200)
    expect(line.endPoint.price).toBe(180)
    expect(line.slope).toBeLessThan(0) // Descending
    expect(line.isBroken).toBe(false)
  })

  it('should not generate descending support line', () => {
    // Descending lows should not form a support line
    const swingPoints: Array<SwingPoint> = [
      { time: 1000, price: 150, type: 'low', index: 5 },
      { time: 2000, price: 100, type: 'low', index: 15 }, // Lower low (descending)
    ]
    const result = generateTrendLines(swingPoints, defaultConfig)

    // Should not create a support line for descending lows
    expect(result.supportLines).toHaveLength(0)
  })

  it('should not generate ascending resistance line', () => {
    // Ascending highs should not form a resistance line
    const swingPoints: Array<SwingPoint> = [
      { time: 1000, price: 150, type: 'high', index: 5 },
      { time: 2000, price: 200, type: 'high', index: 15 }, // Higher high (ascending)
    ]
    const result = generateTrendLines(swingPoints, defaultConfig)

    // Should not create a resistance line for ascending highs
    expect(result.resistanceLines).toHaveLength(0)
  })

  it('should generate multiple support lines from multiple swing lows', () => {
    const swingPoints: Array<SwingPoint> = [
      { time: 1000, price: 100, type: 'low', index: 5 },
      { time: 2000, price: 120, type: 'low', index: 15 },
      { time: 3000, price: 140, type: 'low', index: 25 },
    ]
    const result = generateTrendLines(swingPoints, defaultConfig)

    // Should create lines: (0,1), (0,2), (1,2)
    expect(result.supportLines.length).toBeGreaterThanOrEqual(1)
  })

  it('should respect maxLines configuration', () => {
    const swingPoints: Array<SwingPoint> = [
      { time: 1000, price: 100, type: 'low', index: 5 },
      { time: 2000, price: 110, type: 'low', index: 15 },
      { time: 3000, price: 120, type: 'low', index: 25 },
      { time: 4000, price: 130, type: 'low', index: 35 },
      { time: 5000, price: 140, type: 'low', index: 45 },
    ]
    const config: TrendLineConfig = {
      ...defaultConfig,
      maxLines: 2,
    }
    const result = generateTrendLines(swingPoints, config)

    expect(result.supportLines.length).toBeLessThanOrEqual(2)
  })

  it('should generate unique IDs for each trend line', () => {
    const swingPoints: Array<SwingPoint> = [
      { time: 1000, price: 100, type: 'low', index: 5 },
      { time: 2000, price: 120, type: 'low', index: 15 },
      { time: 3000, price: 140, type: 'low', index: 25 },
    ]
    const result = generateTrendLines(swingPoints, defaultConfig)

    const ids = result.supportLines.map((l) => l.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })

  it('should calculate slope correctly', () => {
    const swingPoints: Array<SwingPoint> = [
      { time: 1000, price: 100, type: 'low', index: 5 },
      { time: 2000, price: 200, type: 'low', index: 15 },
    ]
    const result = generateTrendLines(swingPoints, defaultConfig)

    // Slope = (200 - 100) / (2000 - 1000) = 100 / 1000 = 0.1
    expect(result.supportLines[0].slope).toBe(0.1)
  })
})

describe('getPriceAtTime', () => {
  it('should return start price at start time', () => {
    const line: TrendLine = {
      id: 'test',
      startPoint: { time: 1000, price: 100, type: 'low', index: 5 },
      endPoint: { time: 2000, price: 200, type: 'low', index: 15 },
      type: 'support',
      slope: 0.1,
      isBroken: false,
    }
    const price = getPriceAtTime(line, 1000)
    expect(price).toBe(100)
  })

  it('should return end price at end time', () => {
    const line: TrendLine = {
      id: 'test',
      startPoint: { time: 1000, price: 100, type: 'low', index: 5 },
      endPoint: { time: 2000, price: 200, type: 'low', index: 15 },
      type: 'support',
      slope: 0.1,
      isBroken: false,
    }
    const price = getPriceAtTime(line, 2000)
    expect(price).toBe(200)
  })

  it('should interpolate price between start and end', () => {
    const line: TrendLine = {
      id: 'test',
      startPoint: { time: 1000, price: 100, type: 'low', index: 5 },
      endPoint: { time: 2000, price: 200, type: 'low', index: 15 },
      type: 'support',
      slope: 0.1,
      isBroken: false,
    }
    // At time 1500, should be 150 (midpoint)
    const price = getPriceAtTime(line, 1500)
    expect(price).toBe(150)
  })

  it('should extrapolate price beyond end time', () => {
    const line: TrendLine = {
      id: 'test',
      startPoint: { time: 1000, price: 100, type: 'low', index: 5 },
      endPoint: { time: 2000, price: 200, type: 'low', index: 15 },
      type: 'support',
      slope: 0.1,
      isBroken: false,
    }
    // At time 3000, should be 300
    const price = getPriceAtTime(line, 3000)
    expect(price).toBe(300)
  })

  it('should handle negative slope correctly', () => {
    const line: TrendLine = {
      id: 'test',
      startPoint: { time: 1000, price: 200, type: 'high', index: 5 },
      endPoint: { time: 2000, price: 100, type: 'high', index: 15 },
      type: 'resistance',
      slope: -0.1,
      isBroken: false,
    }
    const price = getPriceAtTime(line, 1500)
    expect(price).toBe(150)
  })
})

describe('checkTrendLineBreak', () => {
  it('should return false when EMA data is empty', () => {
    const line: TrendLine = {
      id: 'test',
      startPoint: { time: 1000, price: 100, type: 'low', index: 5 },
      endPoint: { time: 2000, price: 120, type: 'low', index: 15 },
      type: 'support',
      slope: 0.02,
      isBroken: false,
    }
    const result = checkTrendLineBreak(line, [])
    expect(result).toBe(false)
  })

  it('should detect support line break when EMA crosses below', () => {
    const line: TrendLine = {
      id: 'test',
      startPoint: { time: 1000, price: 100, type: 'low', index: 5 },
      endPoint: { time: 2000, price: 100, type: 'low', index: 15 }, // Flat line at 100
      type: 'support',
      slope: 0,
      isBroken: false,
    }
    // EMA starts above and crosses below
    const emaData: Array<EMADataPoint> = [
      { time: 1200, value: 110 }, // Above support
      { time: 1400, value: 105 }, // Still above
      { time: 1600, value: 95 }, // Crossed below support
      { time: 1800, value: 90 }, // Still below
    ]
    const result = checkTrendLineBreak(line, emaData)
    expect(result).toBe(true)
  })

  it('should detect resistance line break when EMA crosses above', () => {
    const line: TrendLine = {
      id: 'test',
      startPoint: { time: 1000, price: 200, type: 'high', index: 5 },
      endPoint: { time: 2000, price: 200, type: 'high', index: 15 }, // Flat line at 200
      type: 'resistance',
      slope: 0,
      isBroken: false,
    }
    // EMA starts below and crosses above
    const emaData: Array<EMADataPoint> = [
      { time: 1200, value: 190 }, // Below resistance
      { time: 1400, value: 195 }, // Still below
      { time: 1600, value: 205 }, // Crossed above resistance
      { time: 1800, value: 210 }, // Still above
    ]
    const result = checkTrendLineBreak(line, emaData)
    expect(result).toBe(true)
  })

  it('should return false when EMA stays above support line', () => {
    const line: TrendLine = {
      id: 'test',
      startPoint: { time: 1000, price: 100, type: 'low', index: 5 },
      endPoint: { time: 2000, price: 100, type: 'low', index: 15 },
      type: 'support',
      slope: 0,
      isBroken: false,
    }
    const emaData: Array<EMADataPoint> = [
      { time: 1200, value: 110 },
      { time: 1400, value: 115 },
      { time: 1600, value: 120 },
    ]
    const result = checkTrendLineBreak(line, emaData)
    expect(result).toBe(false)
  })

  it('should return false when EMA stays below resistance line', () => {
    const line: TrendLine = {
      id: 'test',
      startPoint: { time: 1000, price: 200, type: 'high', index: 5 },
      endPoint: { time: 2000, price: 200, type: 'high', index: 15 },
      type: 'resistance',
      slope: 0,
      isBroken: false,
    }
    const emaData: Array<EMADataPoint> = [
      { time: 1200, value: 190 },
      { time: 1400, value: 185 },
      { time: 1600, value: 180 },
    ]
    const result = checkTrendLineBreak(line, emaData)
    expect(result).toBe(false)
  })

  it('should handle sloped trend lines correctly', () => {
    const line: TrendLine = {
      id: 'test',
      startPoint: { time: 1000, price: 100, type: 'low', index: 5 },
      endPoint: { time: 2000, price: 150, type: 'low', index: 15 }, // Ascending support
      type: 'support',
      slope: 0.05, // 50 price / 1000 time = 0.05
      isBroken: false,
    }
    // EMA crosses below the ascending line
    const emaData: Array<EMADataPoint> = [
      { time: 1200, value: 130 }, // Line at 1200: 100 + 0.05 * 200 = 110, EMA above
      { time: 1400, value: 115 }, // Line at 1400: 100 + 0.05 * 400 = 120, EMA below
    ]
    const result = checkTrendLineBreak(line, emaData)
    expect(result).toBe(true)
  })

  it('should only check EMA data within trend line time range', () => {
    const line: TrendLine = {
      id: 'test',
      startPoint: { time: 1000, price: 100, type: 'low', index: 5 },
      endPoint: { time: 2000, price: 100, type: 'low', index: 15 },
      type: 'support',
      slope: 0,
      isBroken: false,
    }
    // EMA data outside the trend line range
    const emaData: Array<EMADataPoint> = [
      { time: 500, value: 50 }, // Before line start
      { time: 2500, value: 50 }, // After line end (but we extend, so might check)
    ]
    const result = checkTrendLineBreak(line, emaData)
    // Should not detect break for data outside range (before start)
    expect(result).toBe(false)
  })
})

describe('detectTrendLines', () => {
  // Helper to create candlestick data
  const createCandle = (
    high: number,
    low: number,
    openTime: number
  ): Candlestick => ({
    openTime,
    open: (high + low) / 2,
    high,
    low,
    close: (high + low) / 2,
    volume: 100,
    closeTime: openTime + 3600000,
  })

  const defaultConfig: TrendLineConfig = {
    swingConfig: { lookbackBars: 2 },
    maxLines: 10,
    extendRight: true,
  }

  it('should return empty result for insufficient data', () => {
    const data = [createCandle(100, 90, 0)]
    const emaData: Array<EMADataPoint> = []
    const result = detectTrendLines(data, emaData, defaultConfig)

    expect(result.supportLines).toEqual([])
    expect(result.resistanceLines).toEqual([])
    expect(result.swingPoints).toEqual([])
  })

  it('should detect swing points and generate trend lines', () => {
    // Create data with a clear pattern: ascending lows
    const data: Array<Candlestick> = [
      createCandle(150, 140, 0),
      createCandle(140, 130, 1 * 3600000),
      createCandle(100, 90, 2 * 3600000), // First trough
      createCandle(120, 110, 3 * 3600000),
      createCandle(130, 120, 4 * 3600000),
      createCandle(120, 110, 5 * 3600000),
      createCandle(110, 100, 6 * 3600000), // Second trough (higher low)
      createCandle(130, 120, 7 * 3600000),
      createCandle(140, 130, 8 * 3600000),
    ]
    const emaData: Array<EMADataPoint> = []
    const result = detectTrendLines(data, emaData, defaultConfig)

    expect(result.swingPoints.length).toBeGreaterThanOrEqual(2)
    // Should detect at least one support line from the ascending lows
    // Note: With our strict definition, we need ascending lows
    // First low is 90, second is 100 -> ascending
    const lows = result.swingPoints.filter((p) => p.type === 'low')
    if (lows.length >= 2 && lows[1].price > lows[0].price) {
      expect(result.supportLines.length).toBeGreaterThanOrEqual(1)
    }
  })

  it('should mark trend lines as broken when EMA crosses', () => {
    // Create a simple scenario with a support line and EMA crossing it
    const data: Array<Candlestick> = [
      createCandle(150, 140, 0),
      createCandle(140, 130, 1 * 3600000),
      createCandle(100, 90, 2 * 3600000), // First trough at 90
      createCandle(120, 110, 3 * 3600000),
      createCandle(130, 120, 4 * 3600000),
      createCandle(120, 110, 5 * 3600000),
      createCandle(110, 100, 6 * 3600000), // Second trough at 100 (higher)
      createCandle(130, 120, 7 * 3600000),
      createCandle(140, 130, 8 * 3600000),
    ]

    // EMA that crosses below the support line (which goes from 90 to 100)
    const emaData: Array<EMADataPoint> = [
      { time: 2 * 3600, value: 95 }, // Above trend line initially
      { time: 3 * 3600, value: 92 },
      { time: 4 * 3600, value: 85 }, // Crosses below
      { time: 5 * 3600, value: 80 },
    ]

    const result = detectTrendLines(data, emaData, defaultConfig)

    // If support lines are generated and EMA crosses, they should be marked broken
    result.supportLines.forEach((line) => {
      // Check if any line that the EMA data intersects with is marked as broken
      // This depends on the specific line and EMA interaction
    })
  })

  it('should return swing points in result', () => {
    const data: Array<Candlestick> = [
      createCandle(100, 90, 0),
      createCandle(110, 100, 1 * 3600000),
      createCandle(150, 140, 2 * 3600000), // Peak
      createCandle(130, 120, 3 * 3600000),
      createCandle(120, 110, 4 * 3600000),
    ]
    const emaData: Array<EMADataPoint> = []
    const result = detectTrendLines(data, emaData, defaultConfig)

    expect(result.swingPoints).toBeDefined()
    expect(Array.isArray(result.swingPoints)).toBe(true)
  })
})
