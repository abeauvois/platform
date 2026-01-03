import { useQuery } from '@tanstack/react-query'
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

export interface UseSpotBalancesResult {
  balances: Balance[]
  prices: Map<string, number>
  totalValue: number
  exchange: string | null
  count: number
  isLoading: boolean
  isPricesLoading: boolean
  error: Error | null
  refetch: () => void
}

export interface UseMarginBalancesResult {
  balances: MarginBalance[]
  prices: Map<string, number>
  totalValue: number
  exchange: string | null
  count: number
  isLoading: boolean
  isPricesLoading: boolean
  error: Error | null
  refetch: () => void
}

async function fetchBalances(): Promise<BalanceResponse> {
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

export function useSpotBalances(): UseSpotBalancesResult {
  const {
    data: balanceData,
    isLoading: balancesLoading,
    error: balancesError,
    refetch: refetchBalances,
  } = useQuery<BalanceResponse>({
    queryKey: ['balances'],
    queryFn: fetchBalances,
  })

  const assets = balanceData?.balances.map(b => b.asset) ?? []

  const { data: pricesData, isLoading: pricesLoading } = useQuery<SymbolPrice[]>({
    queryKey: ['prices', assets],
    queryFn: () => fetchPrices(assets),
    enabled: assets.length > 0,
    refetchInterval: 5000,
  })

  const prices = buildPriceMap(pricesData)

  const totalValue = balanceData?.balances.reduce((sum, b) => {
    const usdValue = getUsdValue(b.asset, b.total, prices)
    return sum + (usdValue ?? 0)
  }, 0) ?? 0

  return {
    balances: balanceData?.balances ?? [],
    prices,
    totalValue,
    exchange: balanceData?.exchange ?? null,
    count: balanceData?.count ?? 0,
    isLoading: balancesLoading,
    isPricesLoading: pricesLoading,
    error: balancesError as Error | null,
    refetch: refetchBalances,
  }
}

export function useMarginBalances(): UseMarginBalancesResult {
  const {
    data: marginData,
    isLoading: marginLoading,
    error: marginError,
    refetch: refetchMargin,
  } = useQuery<MarginBalanceResponse>({
    queryKey: ['marginBalances'],
    queryFn: fetchMarginBalances,
  })

  const assets = marginData?.balances.map(b => b.asset) ?? []

  const { data: pricesData, isLoading: pricesLoading } = useQuery<SymbolPrice[]>({
    queryKey: ['marginPrices', assets],
    queryFn: () => fetchPrices(assets),
    enabled: assets.length > 0,
    refetchInterval: 5000,
  })

  const prices = buildPriceMap(pricesData)

  const totalValue = marginData?.balances.reduce((sum, b) => {
    const usdValue = getUsdValue(b.asset, b.netAsset, prices)
    return sum + (usdValue ?? 0)
  }, 0) ?? 0

  return {
    balances: marginData?.balances ?? [],
    prices,
    totalValue,
    exchange: marginData?.exchange ?? null,
    count: marginData?.count ?? 0,
    isLoading: marginLoading,
    isPricesLoading: pricesLoading,
    error: marginError as Error | null,
    refetch: refetchMargin,
  }
}
