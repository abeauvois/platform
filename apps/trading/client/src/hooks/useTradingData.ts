import { useCallback, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { useSpotBalances, useMarginBalances, usePrices } from './queries'
import { invalidateAllTradingData } from '../lib/cache-utils'
import { getUsdValue } from '../utils/balance'
import type { Balance, MarginBalance, SymbolPrice } from '../utils/balance'

/**
 * Unified trading data hook that synchronizes all data fetching
 * to ensure consistent display across all components.
 *
 * Uses composable query hooks from ./queries for each data type.
 */

export interface TradingData {
  // Spot data
  spotBalances: Array<Balance>
  spotTotalValue: number
  spotExchange: string | null
  spotCount: number

  // Margin data
  marginBalances: Array<MarginBalance>
  marginTotalValue: number
  marginExchange: string | null
  marginCount: number

  // Shared price data
  prices: Map<string, number>
  priceChanges: Map<string, number>

  // Loading states
  isBalancesLoading: boolean
  isPricesLoading: boolean

  // Error states
  spotError: Error | null
  marginError: Error | null

  // Sync info
  lastUpdate: number

  // Actions
  refetch: () => void
}

function buildPriceMap(prices: Array<SymbolPrice> | undefined): Map<string, number> {
  const map = new Map<string, number>()
  if (prices) {
    for (const p of prices) {
      map.set(p.symbol, p.price)
    }
  }
  return map
}

function buildPriceChangeMap(prices: Array<SymbolPrice> | undefined): Map<string, number> {
  const map = new Map<string, number>()
  if (prices) {
    for (const p of prices) {
      if (p.priceChangePercent24h !== undefined) {
        map.set(p.symbol, p.priceChangePercent24h)
      }
    }
  }
  return map
}

export function useTradingData(): TradingData {
  const queryClient = useQueryClient()

  // Use individual query hooks
  const {
    data: spotData,
    isLoading: spotLoading,
    error: spotError,
  } = useSpotBalances()

  const {
    data: marginData,
    isLoading: marginLoading,
    error: marginError,
  } = useMarginBalances()

  // Combine all assets for price fetching
  const allAssets = useMemo(() => {
    const spotAssets = spotData?.balances.map((b) => b.asset) ?? []
    const marginAssets = marginData?.balances.map((b) => b.asset) ?? []
    return [...new Set([...spotAssets, ...marginAssets])]
  }, [spotData?.balances, marginData?.balances])

  // Fetch prices for all assets
  const {
    data: pricesData,
    isLoading: pricesLoading,
    dataUpdatedAt,
  } = usePrices(allAssets)

  // Build price maps
  const prices = useMemo(() => buildPriceMap(pricesData), [pricesData])
  const priceChanges = useMemo(() => buildPriceChangeMap(pricesData), [pricesData])

  // Calculate totals
  const spotTotalValue = useMemo(() => {
    return (
      spotData?.balances.reduce((sum, b) => {
        const usdValue = getUsdValue(b.asset, b.total, prices)
        return sum + (usdValue ?? 0)
      }, 0) ?? 0
    )
  }, [spotData?.balances, prices])

  const marginTotalValue = useMemo(() => {
    return (
      marginData?.balances.reduce((sum, b) => {
        const usdValue = getUsdValue(b.asset, b.netAsset, prices)
        return sum + (usdValue ?? 0)
      }, 0) ?? 0
    )
  }, [marginData?.balances, prices])

  // Unified refetch function using cache invalidation
  const refetch = useCallback(() => {
    invalidateAllTradingData(queryClient)
  }, [queryClient])

  return {
    // Spot data
    spotBalances: spotData?.balances ?? [],
    spotTotalValue,
    spotExchange: spotData?.exchange ?? null,
    spotCount: spotData?.count ?? 0,

    // Margin data
    marginBalances: marginData?.balances ?? [],
    marginTotalValue,
    marginExchange: marginData?.exchange ?? null,
    marginCount: marginData?.count ?? 0,

    // Shared price data
    prices,
    priceChanges,

    // Loading states
    isBalancesLoading: spotLoading || marginLoading,
    isPricesLoading: pricesLoading,

    // Error states
    spotError: spotError as Error | null,
    marginError: marginError as Error | null,

    // Sync info - use TanStack Query's dataUpdatedAt
    lastUpdate: dataUpdatedAt,

    // Actions
    refetch,
  }
}
