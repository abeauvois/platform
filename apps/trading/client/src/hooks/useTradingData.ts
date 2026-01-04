import { useCallback, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import {
  type Balance,
  type BalanceResponse,
  type MarginBalance,
  type MarginBalanceResponse,
  type SymbolPrice,
  getTradableSymbol,
  getUsdValue,
  STABLECOINS,
} from '../utils/balance'

/**
 * Unified trading data hook that synchronizes all data fetching
 * to ensure consistent display across all components
 */

const REFRESH_INTERVAL = 5000 // 5 seconds

export interface TradingData {
  // Spot data
  spotBalances: Balance[]
  spotTotalValue: number
  spotExchange: string | null
  spotCount: number

  // Margin data
  marginBalances: MarginBalance[]
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

async function fetchSpotBalances(): Promise<BalanceResponse> {
  const response = await fetch('/api/trading/balance')
  if (!response.ok) {
    throw new Error('Failed to fetch balances')
  }
  return response.json()
}

async function fetchMarginBalances(): Promise<MarginBalanceResponse> {
  const response = await fetch('/api/trading/margin-balance')
  if (!response.ok) {
    throw new Error('Failed to fetch margin balances')
  }
  return response.json()
}

async function fetchPrices(assets: string[]): Promise<SymbolPrice[]> {
  const symbols = assets
    .map(getTradableSymbol)
    .filter(tradable => !STABLECOINS.has(tradable))
    .map(tradable => `${tradable}USDT`)

  if (symbols.length === 0) return []

  const response = await fetch(`/api/trading/tickers?symbols=${symbols.join(',')}`)
  if (!response.ok) {
    throw new Error('Failed to fetch prices')
  }
  return response.json()
}

function buildPriceMap(prices: SymbolPrice[] | undefined): Map<string, number> {
  const map = new Map<string, number>()
  if (prices) {
    for (const p of prices) {
      map.set(p.symbol, p.price)
    }
  }
  return map
}

function buildPriceChangeMap(prices: SymbolPrice[] | undefined): Map<string, number> {
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
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now())

  // Fetch spot balances
  const {
    data: spotData,
    isLoading: spotLoading,
    error: spotError,
  } = useQuery<BalanceResponse>({
    queryKey: ['balances'],
    queryFn: fetchSpotBalances,
    refetchInterval: REFRESH_INTERVAL,
  })

  // Fetch margin balances
  const {
    data: marginData,
    isLoading: marginLoading,
    error: marginError,
  } = useQuery<MarginBalanceResponse>({
    queryKey: ['marginBalances'],
    queryFn: fetchMarginBalances,
    refetchInterval: REFRESH_INTERVAL,
  })

  // Combine all assets for price fetching
  const allAssets = useMemo(() => {
    const spotAssets = spotData?.balances.map(b => b.asset) ?? []
    const marginAssets = marginData?.balances.map(b => b.asset) ?? []
    return [...new Set([...spotAssets, ...marginAssets])]
  }, [spotData?.balances, marginData?.balances])

  // Fetch prices for all assets
  const { data: pricesData, isLoading: pricesLoading } = useQuery<SymbolPrice[]>({
    queryKey: ['allPrices', allAssets],
    queryFn: async () => {
      const prices = await fetchPrices(allAssets)
      // Update the timestamp when prices are fetched
      setLastUpdate(Date.now())
      return prices
    },
    enabled: allAssets.length > 0,
    refetchInterval: REFRESH_INTERVAL,
  })

  // Build price maps
  const prices = useMemo(() => buildPriceMap(pricesData), [pricesData])
  const priceChanges = useMemo(() => buildPriceChangeMap(pricesData), [pricesData])

  // Calculate totals
  const spotTotalValue = useMemo(() => {
    return spotData?.balances.reduce((sum, b) => {
      const usdValue = getUsdValue(b.asset, b.total, prices)
      return sum + (usdValue ?? 0)
    }, 0) ?? 0
  }, [spotData?.balances, prices])

  const marginTotalValue = useMemo(() => {
    return marginData?.balances.reduce((sum, b) => {
      const usdValue = getUsdValue(b.asset, b.netAsset, prices)
      return sum + (usdValue ?? 0)
    }, 0) ?? 0
  }, [marginData?.balances, prices])

  // Unified refetch function
  const refetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['balances'] })
    queryClient.invalidateQueries({ queryKey: ['marginBalances'] })
    queryClient.invalidateQueries({ queryKey: ['allPrices'] })
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

    // Sync info
    lastUpdate,

    // Actions
    refetch,
  }
}
