import { describe, expect, test } from 'bun:test'

import {
  getPricePrecision,
  getQuantityPrecision,
  roundToPrecision,
  validateBalance,
  validateOrderValue,
} from './order'

describe('roundToPrecision', () => {
  test('rounds to 2 decimal places', () => {
    expect(roundToPrecision(123.456789, 2)).toBe(123.46)
    expect(roundToPrecision(100.004, 2)).toBe(100.0)
    expect(roundToPrecision(99.995, 2)).toBe(100.0)
  })

  test('rounds to 4 decimal places', () => {
    expect(roundToPrecision(0.123456, 4)).toBe(0.1235)
    expect(roundToPrecision(0.00001, 4)).toBe(0)
  })

  test('rounds to 5 decimal places', () => {
    expect(roundToPrecision(0.123456789, 5)).toBe(0.12346)
  })

  test('handles whole numbers', () => {
    expect(roundToPrecision(100, 2)).toBe(100)
    expect(roundToPrecision(50, 0)).toBe(50)
  })
})

describe('getPricePrecision', () => {
  test('returns 2 decimals for prices >= 1', () => {
    expect(getPricePrecision(100)).toBe(2)
    expect(getPricePrecision(50000)).toBe(2)
    expect(getPricePrecision(1)).toBe(2)
    expect(getPricePrecision(1.5)).toBe(2)
  })

  test('returns 4 decimals for prices >= 0.01 and < 1', () => {
    expect(getPricePrecision(0.99)).toBe(4)
    expect(getPricePrecision(0.5)).toBe(4)
    expect(getPricePrecision(0.01)).toBe(4)
  })

  test('returns 6 decimals for very low prices < 0.01', () => {
    expect(getPricePrecision(0.009)).toBe(6)
    expect(getPricePrecision(0.001)).toBe(6)
    expect(getPricePrecision(0.0001)).toBe(6)
  })
})

describe('getQuantityPrecision', () => {
  test('returns 5 decimals for high-value assets (price >= 10000)', () => {
    expect(getQuantityPrecision(50000)).toBe(5)
    expect(getQuantityPrecision(10000)).toBe(5)
  })

  test('returns 2 decimals for mid-value assets (100 <= price < 10000)', () => {
    expect(getQuantityPrecision(9999)).toBe(2)
    expect(getQuantityPrecision(100)).toBe(2)
    expect(getQuantityPrecision(500)).toBe(2)
  })

  test('returns 1 decimal for low-value assets (price < 100)', () => {
    expect(getQuantityPrecision(99)).toBe(1)
    expect(getQuantityPrecision(1)).toBe(1)
    expect(getQuantityPrecision(0.5)).toBe(1)
  })
})

describe('validateOrderValue', () => {
  const MAX_VALUE = 500

  test('returns valid for order within limit', () => {
    const result = validateOrderValue(1, 100, MAX_VALUE)
    expect(result.valid).toBe(true)
    expect(result.error).toBeUndefined()
  })

  test('returns valid for order exactly at limit', () => {
    const result = validateOrderValue(5, 100, MAX_VALUE)
    expect(result.valid).toBe(true)
  })

  test('returns invalid for order exceeding limit', () => {
    const result = validateOrderValue(10, 100, MAX_VALUE)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('1000.00')
    expect(result.error).toContain('500')
  })

  test('returns invalid for zero quantity', () => {
    const result = validateOrderValue(0, 100, MAX_VALUE)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('greater than 0')
  })

  test('returns invalid for negative quantity', () => {
    const result = validateOrderValue(-1, 100, MAX_VALUE)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('greater than 0')
  })
})

describe('validateBalance', () => {
  test('returns valid when sufficient balance', () => {
    const result = validateBalance(100, 200, 'USDC')
    expect(result.valid).toBe(true)
    expect(result.error).toBeUndefined()
  })

  test('returns valid when amount equals available', () => {
    const result = validateBalance(100, 100, 'USDC')
    expect(result.valid).toBe(true)
  })

  test('returns invalid when insufficient balance', () => {
    const result = validateBalance(200, 100, 'USDC')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('Insufficient USDC')
    expect(result.error).toContain('Need: 200')
    expect(result.error).toContain('Available: 100')
  })

  test('includes locked amount in error message when provided', () => {
    const result = validateBalance(200, 100, 'BTC', 50)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('50')
    expect(result.error).toContain('locked')
  })

  test('omits locked amount when zero', () => {
    const result = validateBalance(200, 100, 'ETH', 0)
    expect(result.valid).toBe(false)
    expect(result.error).not.toContain('locked')
  })
})
