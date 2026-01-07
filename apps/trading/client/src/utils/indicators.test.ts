import { describe, expect, it } from 'vitest'
import { calculateEMA } from './indicators'
import type { Candlestick } from '../lib/api'

describe('calculateEMA', () => {
  // Helper to create candlestick data
  const createCandle = (close: number, openTime: number = 0): Candlestick => ({
    openTime,
    open: close,
    high: close,
    low: close,
    close,
    volume: 100,
    closeTime: openTime + 3600000,
  })

  it('should return empty array when data has fewer points than period', () => {
    const data = [createCandle(100), createCandle(101), createCandle(102)]
    const result = calculateEMA(data, 20)
    expect(result).toEqual([])
  })

  it('should return empty array when data is empty', () => {
    const result = calculateEMA([], 20)
    expect(result).toEqual([])
  })

  it('should calculate EMA correctly for exact period length', () => {
    // Create 20 candles with increasing prices 1-20
    const data = Array.from({ length: 20 }, (_, i) =>
      createCandle(i + 1, i * 3600000)
    )
    const result = calculateEMA(data, 20)

    // First EMA equals SMA of first 20 values = (1+2+...+20)/20 = 210/20 = 10.5
    expect(result).toHaveLength(1)
    expect(result[0].value).toBe(10.5)
  })

  it('should calculate EMA correctly for multiple points', () => {
    // Create 21 candles
    const data = Array.from({ length: 21 }, (_, i) =>
      createCandle(i + 1, i * 3600000)
    )
    const result = calculateEMA(data, 20)

    // First EMA = SMA = 10.5
    // Second EMA = (21 - 10.5) * (2/21) + 10.5 = 10.5 * 0.0952 + 10.5 ≈ 11.5
    expect(result).toHaveLength(2)
    expect(result[0].value).toBe(10.5)

    // EMA formula: (close - prevEMA) * multiplier + prevEMA
    // multiplier = 2 / (20 + 1) = 2/21
    const multiplier = 2 / 21
    const expectedSecondEMA = (21 - 10.5) * multiplier + 10.5
    expect(result[1].value).toBeCloseTo(expectedSecondEMA, 10)
  })

  it('should include time property from candle openTime', () => {
    const data = Array.from({ length: 20 }, (_, i) =>
      createCandle(100, i * 3600000)
    )
    const result = calculateEMA(data, 20)

    // The first EMA corresponds to the 20th candle (index 19)
    expect(result[0].time).toBe(Math.floor((19 * 3600000) / 1000))
  })

  it('should handle constant prices', () => {
    const data = Array.from({ length: 25 }, (_, i) =>
      createCandle(100, i * 3600000)
    )
    const result = calculateEMA(data, 20)

    // All EMA values should be 100 for constant price
    expect(result).toHaveLength(6)
    result.forEach((point) => {
      expect(point.value).toBe(100)
    })
  })

  it('should track upward trend', () => {
    // Create data with clear upward trend
    const data = Array.from({ length: 30 }, (_, i) =>
      createCandle(100 + i * 10, i * 3600000)
    )
    const result = calculateEMA(data, 20)

    // Each EMA should be higher than the previous
    for (let i = 1; i < result.length; i++) {
      expect(result[i].value).toBeGreaterThan(result[i - 1].value)
    }
  })

  it('should track downward trend', () => {
    // Create data with clear downward trend
    const data = Array.from({ length: 30 }, (_, i) =>
      createCandle(300 - i * 10, i * 3600000)
    )
    const result = calculateEMA(data, 20)

    // Each EMA should be lower than the previous
    for (let i = 1; i < result.length; i++) {
      expect(result[i].value).toBeLessThan(result[i - 1].value)
    }
  })

  it('should work with custom period', () => {
    const data = Array.from({ length: 15 }, (_, i) =>
      createCandle(i + 1, i * 3600000)
    )
    const result = calculateEMA(data, 10)

    // First EMA = SMA of first 10 values = (1+2+...+10)/10 = 55/10 = 5.5
    expect(result).toHaveLength(6)
    expect(result[0].value).toBe(5.5)
  })
})
