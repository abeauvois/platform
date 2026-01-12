import { describe, expect, it } from 'bun:test'
import { detectSwingPoints } from './swingPoints.js'
import type { Candlestick, SwingDetectionConfig } from '../types.js'

describe('detectSwingPoints', () => {
  // Helper to create candlestick data
  const createCandle = (
    high: number,
    low: number,
    openTime: number = 0
  ): Candlestick => ({
    openTime,
    open: (high + low) / 2,
    high,
    low,
    close: (high + low) / 2,
    volume: 100,
    closeTime: openTime + 3600000,
  })

  const defaultConfig: SwingDetectionConfig = { lookbackBars: 5 }

  it('should return empty array when data has fewer points than required', () => {
    // With lookbackBars=5, we need at least 11 candles (5 + 1 + 5)
    const data = Array.from({ length: 10 }, (_, i) =>
      createCandle(100 + i, 90 + i, i * 3600000)
    )
    const result = detectSwingPoints(data, defaultConfig)
    expect(result).toEqual([])
  })

  it('should return empty array when data is empty', () => {
    const result = detectSwingPoints([], defaultConfig)
    expect(result).toEqual([])
  })

  it('should detect a single swing high with 5-bar lookback', () => {
    // Create a peak: 5 ascending candles, peak, 5 descending candles
    const data: Array<Candlestick> = []
    // 5 candles leading up to peak (indices 0-4)
    for (let i = 0; i < 5; i++) {
      data.push(createCandle(100 + i * 10, 90 + i * 10, i * 3600000))
    }
    // Peak candle at index 5
    data.push(createCandle(200, 180, 5 * 3600000))
    // 5 candles descending from peak (indices 6-10)
    for (let i = 0; i < 5; i++) {
      data.push(createCandle(190 - i * 10, 170 - i * 10, (6 + i) * 3600000))
    }

    const result = detectSwingPoints(data, defaultConfig)

    const swingHighs = result.filter((p) => p.type === 'high')
    expect(swingHighs).toHaveLength(1)
    expect(swingHighs[0].price).toBe(200) // The high of the peak candle
    expect(swingHighs[0].index).toBe(5)
    expect(swingHighs[0].time).toBe(5 * 3600) // Time in seconds
  })

  it('should detect a single swing low with 5-bar lookback', () => {
    // Create a trough: 5 descending candles, trough, 5 ascending candles
    const data: Array<Candlestick> = []
    // 5 candles descending (indices 0-4)
    for (let i = 0; i < 5; i++) {
      data.push(createCandle(200 - i * 10, 180 - i * 10, i * 3600000))
    }
    // Trough candle at index 5
    data.push(createCandle(100, 80, 5 * 3600000))
    // 5 candles ascending (indices 6-10)
    for (let i = 0; i < 5; i++) {
      data.push(createCandle(110 + i * 10, 90 + i * 10, (6 + i) * 3600000))
    }

    const result = detectSwingPoints(data, defaultConfig)

    const swingLows = result.filter((p) => p.type === 'low')
    expect(swingLows).toHaveLength(1)
    expect(swingLows[0].price).toBe(80) // The low of the trough candle
    expect(swingLows[0].index).toBe(5)
    expect(swingLows[0].time).toBe(5 * 3600) // Time in seconds
  })

  it('should detect both swing high and swing low in same dataset', () => {
    // Create data with a peak followed by a trough
    const data: Array<Candlestick> = []

    // First, create ascending data leading to a peak
    for (let i = 0; i < 5; i++) {
      data.push(createCandle(100 + i * 10, 90 + i * 10, i * 3600000))
    }
    // Peak at index 5
    data.push(createCandle(200, 180, 5 * 3600000))
    // Descending to trough
    for (let i = 0; i < 5; i++) {
      data.push(createCandle(190 - i * 20, 170 - i * 20, (6 + i) * 3600000))
    }
    // Trough at index 11
    data.push(createCandle(80, 60, 11 * 3600000))
    // Ascending from trough
    for (let i = 0; i < 5; i++) {
      data.push(createCandle(90 + i * 10, 70 + i * 10, (12 + i) * 3600000))
    }

    const result = detectSwingPoints(data, defaultConfig)

    const swingHighs = result.filter((p) => p.type === 'high')
    const swingLows = result.filter((p) => p.type === 'low')

    expect(swingHighs).toHaveLength(1)
    expect(swingHighs[0].index).toBe(5)
    expect(swingLows).toHaveLength(1)
    expect(swingLows[0].index).toBe(11)
  })

  it('should handle flat price data with no swing points', () => {
    // All candles have the same high and low
    const data = Array.from({ length: 15 }, (_, i) =>
      createCandle(100, 90, i * 3600000)
    )
    const result = detectSwingPoints(data, defaultConfig)
    expect(result).toEqual([])
  })

  it('should work with custom lookback period', () => {
    const config: SwingDetectionConfig = { lookbackBars: 2 }

    // Create a peak with 2 candles on each side
    const data: Array<Candlestick> = []
    // 2 ascending candles
    data.push(createCandle(100, 90, 0))
    data.push(createCandle(110, 100, 1 * 3600000))
    // Peak
    data.push(createCandle(150, 140, 2 * 3600000))
    // 2 descending candles
    data.push(createCandle(120, 110, 3 * 3600000))
    data.push(createCandle(110, 100, 4 * 3600000))

    const result = detectSwingPoints(data, config)

    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('high')
    expect(result[0].index).toBe(2)
  })

  it('should detect multiple swing highs in trending data', () => {
    const config: SwingDetectionConfig = { lookbackBars: 2 }

    // Create data with two peaks
    const data: Array<Candlestick> = [
      createCandle(100, 90, 0),
      createCandle(110, 100, 1 * 3600000),
      createCandle(150, 140, 2 * 3600000), // First peak
      createCandle(130, 120, 3 * 3600000),
      createCandle(120, 110, 4 * 3600000),
      createCandle(130, 120, 5 * 3600000),
      createCandle(160, 150, 6 * 3600000), // Second peak
      createCandle(140, 130, 7 * 3600000),
      createCandle(130, 120, 8 * 3600000),
    ]

    const result = detectSwingPoints(data, config)
    const swingHighs = result.filter((p) => p.type === 'high')

    expect(swingHighs).toHaveLength(2)
    expect(swingHighs[0].index).toBe(2)
    expect(swingHighs[1].index).toBe(6)
  })

  it('should detect multiple swing lows in trending data', () => {
    const config: SwingDetectionConfig = { lookbackBars: 2 }

    // Create data with two troughs
    const data: Array<Candlestick> = [
      createCandle(150, 140, 0),
      createCandle(140, 130, 1 * 3600000),
      createCandle(100, 90, 2 * 3600000), // First trough
      createCandle(120, 110, 3 * 3600000),
      createCandle(130, 120, 4 * 3600000),
      createCandle(120, 110, 5 * 3600000),
      createCandle(80, 70, 6 * 3600000), // Second trough
      createCandle(110, 100, 7 * 3600000),
      createCandle(120, 110, 8 * 3600000),
    ]

    const result = detectSwingPoints(data, config)
    const swingLows = result.filter((p) => p.type === 'low')

    expect(swingLows).toHaveLength(2)
    expect(swingLows[0].index).toBe(2)
    expect(swingLows[1].index).toBe(6)
  })

  it('should return swing points sorted by time', () => {
    const config: SwingDetectionConfig = { lookbackBars: 2 }

    // Create alternating peaks and troughs
    const data: Array<Candlestick> = [
      createCandle(100, 90, 0),
      createCandle(110, 100, 1 * 3600000),
      createCandle(150, 140, 2 * 3600000), // Peak
      createCandle(130, 120, 3 * 3600000),
      createCandle(80, 70, 4 * 3600000), // Trough
      createCandle(100, 90, 5 * 3600000),
      createCandle(120, 110, 6 * 3600000),
    ]

    const result = detectSwingPoints(data, config)

    // Should be sorted by time
    for (let i = 1; i < result.length; i++) {
      expect(result[i].time).toBeGreaterThan(result[i - 1].time)
    }
  })

  it('should handle edge case where swing point is not strictly greater/less', () => {
    const config: SwingDetectionConfig = { lookbackBars: 2 }

    // Create data where one of the lookback candles has equal high
    const data: Array<Candlestick> = [
      createCandle(100, 90, 0),
      createCandle(150, 140, 1 * 3600000), // Same high as peak
      createCandle(150, 140, 2 * 3600000), // Not a swing high (equal neighbor)
      createCandle(130, 120, 3 * 3600000),
      createCandle(120, 110, 4 * 3600000),
    ]

    const result = detectSwingPoints(data, config)
    const swingHighs = result.filter((p) => p.type === 'high')

    // Should not detect a swing high when neighbors have equal highs
    expect(swingHighs).toHaveLength(0)
  })
})
