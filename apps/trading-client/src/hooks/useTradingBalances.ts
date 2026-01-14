import { useMemo } from 'react'

import type { TradingData } from './useTradingData'

import { normalizeAsset } from './useSelectedAsset'

export interface UseTradingBalancesReturn {
  /** Available base asset balance (free to trade) */
  baseBalance: number
  /** Locked base asset balance (in open orders) */
  baseLockedBalance: number
  /** Available quote asset balance (free to trade) */
  quoteBalance: number
  /** Locked quote asset balance (in open orders) */
  quoteLockedBalance: number
}

/**
 * Hook to get trading balances for the selected trading pair
 *
 * Takes the max of spot and margin free balances for available balance.
 * Combines spot and margin locked balances for total locked.
 */
export function useTradingBalances(
  baseAsset: string,
  quoteAsset: string,
  tradingData: TradingData
): UseTradingBalancesReturn {
  return useMemo(() => {
    // Find base asset balances
    const spotBaseData = tradingData.spotBalances.find(
      (b) => normalizeAsset(b.asset) === baseAsset
    )
    const marginBaseData = tradingData.marginBalances.find(
      (b) => normalizeAsset(b.asset) === baseAsset
    )

    // Use max of spot/margin free balance (available to trade)
    const baseBalance = Math.max(spotBaseData?.free ?? 0, marginBaseData?.free ?? 0)
    const baseLockedBalance = (spotBaseData?.locked ?? 0) + (marginBaseData?.locked ?? 0)

    // Find quote asset balances
    const spotQuoteData = tradingData.spotBalances.find(
      (b) => normalizeAsset(b.asset) === quoteAsset
    )
    const marginQuoteData = tradingData.marginBalances.find(
      (b) => normalizeAsset(b.asset) === quoteAsset
    )

    const quoteBalance = Math.max(spotQuoteData?.free ?? 0, marginQuoteData?.free ?? 0)
    const quoteLockedBalance = (spotQuoteData?.locked ?? 0) + (marginQuoteData?.locked ?? 0)

    return {
      baseBalance,
      baseLockedBalance,
      quoteBalance,
      quoteLockedBalance,
    }
  }, [baseAsset, quoteAsset, tradingData.spotBalances, tradingData.marginBalances])
}
