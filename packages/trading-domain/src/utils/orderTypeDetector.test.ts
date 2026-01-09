import { describe, expect, it } from 'bun:test'
import { detectStopOrderCategory, getBinanceOrderType } from './orderTypeDetector.js'

describe('detectStopOrderCategory', () => {
  describe('BUY orders', () => {
    it('should return stop_loss when buy stop price is above current price', () => {
      // BUY above current = STOP_LOSS (triggered when price rises to stop)
      const result = detectStopOrderCategory('buy', 45000, 44000)
      expect(result).toBe('stop_loss')
    })

    it('should return take_profit when buy stop price is below current price', () => {
      // BUY below current = TAKE_PROFIT (triggered when price drops to stop)
      const result = detectStopOrderCategory('buy', 43000, 44000)
      expect(result).toBe('take_profit')
    })

    it('should return stop_loss when buy stop price equals current price', () => {
      // Edge case: equal prices treated as stop_loss (neutral)
      const result = detectStopOrderCategory('buy', 44000, 44000)
      expect(result).toBe('stop_loss')
    })
  })

  describe('SELL orders', () => {
    it('should return take_profit when sell stop price is above current price', () => {
      // SELL above current = TAKE_PROFIT (triggered when price rises to stop)
      const result = detectStopOrderCategory('sell', 45000, 44000)
      expect(result).toBe('take_profit')
    })

    it('should return stop_loss when sell stop price is below current price', () => {
      // SELL below current = STOP_LOSS (triggered when price drops to stop)
      const result = detectStopOrderCategory('sell', 43000, 44000)
      expect(result).toBe('stop_loss')
    })

    it('should return stop_loss when sell stop price equals current price', () => {
      // Edge case: equal prices treated as stop_loss for sell (conservative)
      const result = detectStopOrderCategory('sell', 44000, 44000)
      expect(result).toBe('stop_loss')
    })
  })
})

describe('getBinanceOrderType', () => {
  describe('market orders (isLimit = false)', () => {
    it('should return STOP_LOSS for stop_loss category', () => {
      const result = getBinanceOrderType('stop_loss', false)
      expect(result).toBe('STOP_LOSS')
    })

    it('should return TAKE_PROFIT for take_profit category', () => {
      const result = getBinanceOrderType('take_profit', false)
      expect(result).toBe('TAKE_PROFIT')
    })
  })

  describe('limit orders (isLimit = true)', () => {
    it('should return STOP_LOSS_LIMIT for stop_loss category', () => {
      const result = getBinanceOrderType('stop_loss', true)
      expect(result).toBe('STOP_LOSS_LIMIT')
    })

    it('should return TAKE_PROFIT_LIMIT for take_profit category', () => {
      const result = getBinanceOrderType('take_profit', true)
      expect(result).toBe('TAKE_PROFIT_LIMIT')
    })
  })
})
