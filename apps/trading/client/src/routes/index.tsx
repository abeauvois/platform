import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, DollarSign, RefreshCw, Scale, Wallet } from 'lucide-react'
import { TradingChart } from '../components/TradingChart'

const MIN_USD_VALUE_FILTER = 50 // Only show balances with USD value > $50

export const Route = createFileRoute('/')({
  component: HomePage,
})

// Balance response type based on the API
interface BalanceResponse {
  exchange: string
  balances: Array<{
    asset: string
    free: number
    locked: number
    total: number
  }>
  count: number
}

// Price response type for getTickers
interface SymbolPrice {
  symbol: string
  price: number
}

// Margin balance response type based on the API
interface MarginBalanceResponse {
  exchange: string
  balances: Array<{
    asset: string
    free: number
    locked: number
    borrowed: number
    interest: number
    netAsset: number
  }>
  count: number
}

function HomePage() {
  // Fetch account balances
  const {
    data: balances,
    isLoading: balancesLoading,
    error: balancesError,
    refetch: refetchBalances,
  } = useQuery<BalanceResponse>({
    queryKey: ['balances'],
    queryFn: async () => {
      const response = await fetch('/api/trading/balance')
      if (!response.ok) {
        throw new Error('Failed to fetch balances')
      }
      return response.json()
    },
    // refetchInterval: 10000, // Refresh every 10 seconds
  })

  // Convert asset name to tradeable symbol
  // LD prefix = Binance Flexible Savings tokens (e.g., LDBTC -> BTC)
  const getTradeableSymbol = (asset: string): string => {
    if (asset.startsWith('LD')) {
      return asset.slice(2) // Remove LD prefix
    }
    return asset
  }

  // Fetch prices for all balance assets to calculate USD values
  const { data: prices, isLoading: pricesLoading } = useQuery<Array<SymbolPrice>>({
    queryKey: ['prices', balances?.balances.map(b => b.asset)],
    queryFn: async () => {
      if (!balances || balances.count === 0) return []
      // Get symbols for non-stablecoin assets (USDT is already in USD)
      const symbols = balances.balances
        .filter(b => {
          const tradeable = getTradeableSymbol(b.asset)
          return tradeable !== 'USDT' && tradeable !== 'USDC' && tradeable !== 'BUSD'
        })
        .map(b => `${getTradeableSymbol(b.asset)}USDT`)
      if (symbols.length === 0) return []
      const response = await fetch(`/api/trading/tickers?symbols=${symbols.join(',')}`)
      if (!response.ok) {
        throw new Error('Failed to fetch prices')
      }
      return response.json()
    },
    enabled: !!balances && balances.count > 0,
    refetchInterval: 5000, // Refresh prices every 5 seconds
  })

  // Fetch margin account balances
  const {
    data: marginBalances,
    isLoading: marginLoading,
    error: marginError,
    refetch: refetchMargin,
  } = useQuery<MarginBalanceResponse>({
    queryKey: ['marginBalances'],
    queryFn: async () => {
      const response = await fetch('/api/trading/margin-balance')
      if (!response.ok) {
        throw new Error('Failed to fetch margin balances')
      }
      return response.json()
    },
  })

  // Fetch prices for margin balance assets to calculate USD values
  const { data: marginPrices, isLoading: marginPricesLoading } = useQuery<Array<SymbolPrice>>({
    queryKey: ['marginPrices', marginBalances?.balances.map(b => b.asset)],
    queryFn: async () => {
      if (!marginBalances || marginBalances.count === 0) return []
      // Get symbols for non-stablecoin assets
      const symbols = marginBalances.balances
        .filter(b => {
          const tradeable = getTradeableSymbol(b.asset)
          return tradeable !== 'USDT' && tradeable !== 'USDC' && tradeable !== 'BUSD'
        })
        .map(b => `${getTradeableSymbol(b.asset)}USDT`)
      if (symbols.length === 0) return []
      const response = await fetch(`/api/trading/tickers?symbols=${symbols.join(',')}`)
      if (!response.ok) {
        throw new Error('Failed to fetch margin prices')
      }
      return response.json()
    },
    enabled: !!marginBalances && marginBalances.count > 0,
    refetchInterval: 5000,
  })

  // Helper to get USD value for an asset (spot balances)
  const getUsdValue = (asset: string, total: number): number | null => {
    const tradeable = getTradeableSymbol(asset)
    // Stablecoins are already in USD
    if (tradeable === 'USDT' || tradeable === 'USDC' || tradeable === 'BUSD') {
      return total
    }
    // Find price for this asset
    const priceData = prices?.find(p => p.symbol === `${tradeable}USDT`)
    if (!priceData) return null
    return total * priceData.price
  }

  // Helper to get USD value for margin assets
  const getMarginUsdValue = (asset: string, netAsset: number): number | null => {
    const tradeable = getTradeableSymbol(asset)
    // Stablecoins are already in USD
    if (tradeable === 'USDT' || tradeable === 'USDC' || tradeable === 'BUSD') {
      return netAsset
    }
    // Find price for this asset
    const priceData = marginPrices?.find(p => p.symbol === `${tradeable}USDT`)
    if (!priceData) return null
    return netAsset * priceData.price
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price)
  }

  const formatBalance = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8,
    }).format(amount)
  }

  return (
    <div className="min-h-screen bg-base-200">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-base-content mb-2">
            Trading Dashboard
          </h1>
          <p className="text-base-content/70">
            Monitor your portfolio value and account balances
          </p>
        </div>

        {/* Trading Chart - Full Width */}
        <div className="mb-6">
          <TradingChart symbol="BTCUSDT" interval="1h" limit={100} />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Global Portfolio Value Card */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <div className="flex items-center justify-between mb-4">
                <h2 className="card-title flex items-center gap-2">
                  <DollarSign className="w-6 h-6 text-primary" />
                  Portfolio Value
                </h2>
                <button
                  onClick={() => {
                    refetchBalances()
                    refetchMargin()
                  }}
                  className="btn btn-ghost btn-sm btn-circle"
                  disabled={balancesLoading || marginLoading}
                >
                  <RefreshCw
                    className={`w-4 h-4 ${balancesLoading || marginLoading ? 'animate-spin' : ''}`}
                  />
                </button>
              </div>

              {(balancesLoading || marginLoading) && !balances && !marginBalances && (
                <div className="flex items-center justify-center py-12">
                  <span className="loading loading-spinner loading-lg text-primary"></span>
                </div>
              )}

              {(balancesError || marginError) && (
                <div className="alert alert-error">
                  <AlertCircle className="w-5 h-5" />
                  <span>
                    Failed to load portfolio data
                  </span>
                </div>
              )}

              {(balances || marginBalances) && (
                (() => {
                  // Calculate spot total
                  const spotTotal = balances?.balances.reduce((sum, b) => {
                    const usdValue = getUsdValue(b.asset, b.total)
                    return sum + (usdValue ?? 0)
                  }, 0) ?? 0

                  // Calculate margin total
                  const marginTotal = marginBalances?.balances.reduce((sum, b) => {
                    const usdValue = getMarginUsdValue(b.asset, b.netAsset)
                    return sum + (usdValue ?? 0)
                  }, 0) ?? 0

                  const totalValue = spotTotal + marginTotal
                  const isLoading = pricesLoading || marginPricesLoading

                  return (
                    <div className="space-y-4">
                      {/* Total Portfolio Value */}
                      <div className="text-center py-4">
                        <div className="text-sm text-base-content/60 mb-1">
                          Total Portfolio Value
                        </div>
                        <div className="text-5xl font-bold text-primary">
                          {isLoading ? (
                            <span className="loading loading-dots loading-lg"></span>
                          ) : (
                            formatPrice(totalValue)
                          )}
                        </div>
                      </div>

                      {/* Breakdown Stats */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="stat bg-base-200 rounded-lg p-4">
                          <div className="stat-title text-xs flex items-center gap-1">
                            <Wallet className="w-3 h-3" />
                            Spot Account
                          </div>
                          <div className="stat-value text-lg text-secondary">
                            {isLoading ? (
                              <span className="loading loading-dots loading-sm"></span>
                            ) : (
                              formatPrice(spotTotal)
                            )}
                          </div>
                          <div className="stat-desc">
                            {balances?.count ?? 0} assets
                          </div>
                        </div>
                        <div className="stat bg-base-200 rounded-lg p-4">
                          <div className="stat-title text-xs flex items-center gap-1">
                            <Scale className="w-3 h-3" />
                            Margin Account
                          </div>
                          <div className="stat-value text-lg text-warning">
                            {isLoading ? (
                              <span className="loading loading-dots loading-sm"></span>
                            ) : (
                              formatPrice(marginTotal)
                            )}
                          </div>
                          <div className="stat-desc">
                            {marginBalances?.count ?? 0} assets
                          </div>
                        </div>
                      </div>

                      {/* Allocation */}
                      {totalValue > 0 && !isLoading && (
                        <div className="space-y-2">
                          <div className="text-xs text-base-content/60 text-center">
                            Allocation
                          </div>
                          <div className="flex gap-1 h-3 rounded-full overflow-hidden">
                            <div
                              className="bg-secondary"
                              style={{ width: `${(spotTotal / totalValue) * 100}%` }}
                              title={`Spot: ${((spotTotal / totalValue) * 100).toFixed(1)}%`}
                            />
                            <div
                              className="bg-warning"
                              style={{ width: `${(marginTotal / totalValue) * 100}%` }}
                              title={`Margin: ${((marginTotal / totalValue) * 100).toFixed(1)}%`}
                            />
                          </div>
                          <div className="flex justify-between text-xs text-base-content/60">
                            <span>Spot: {((spotTotal / totalValue) * 100).toFixed(1)}%</span>
                            <span>Margin: {((marginTotal / totalValue) * 100).toFixed(1)}%</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })()
              )}
            </div>
          </div>

          {/* Account Balance Card */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <div className="flex items-center justify-between mb-4">
                <h2 className="card-title flex items-center gap-2">
                  <Wallet className="w-6 h-6 text-secondary" />
                  Account Balance
                </h2>
                <button
                  onClick={() => refetchBalances()}
                  className="btn btn-ghost btn-sm btn-circle"
                  disabled={balancesLoading}
                >
                  <RefreshCw
                    className={`w-4 h-4 ${balancesLoading ? 'animate-spin' : ''}`}
                  />
                </button>
              </div>

              {balancesLoading && (
                <div className="flex items-center justify-center py-12">
                  <span className="loading loading-spinner loading-lg text-secondary"></span>
                </div>
              )}

              {balancesError && (
                <div className="alert alert-error">
                  <AlertCircle className="w-5 h-5" />
                  <span>
                    Failed to load balances:{' '}
                    {(balancesError).message}
                  </span>
                </div>
              )}

              {balances && (
                <div className="space-y-4">
                  {/* Exchange Info */}
                  <div className="badge badge-outline badge-lg">
                    {balances.exchange}
                  </div>

                  {/* Balance List - filtered to show only > $50 USD */}
                  {(() => {
                    const filteredBalances = [...balances.balances]
                      .map(balance => ({
                        ...balance,
                        usdValue: getUsdValue(balance.asset, balance.total)
                      }))
                      .filter(b => b.usdValue !== null && b.usdValue > MIN_USD_VALUE_FILTER)
                      .sort((a, b) => (b.usdValue ?? 0) - (a.usdValue ?? 0))

                    if (filteredBalances.length === 0) {
                      return (
                        <div className="text-center py-8 text-base-content/60">
                          No balances over ${MIN_USD_VALUE_FILTER}
                        </div>
                      )
                    }

                    return (
                      <div className="space-y-3">
                        {filteredBalances.map((balance) => (
                          <div
                            key={balance.asset}
                            className="flex items-center justify-between p-4 bg-base-200 rounded-lg hover:bg-base-300 transition-colors"
                          >
                            <div>
                              <div className="font-bold text-lg">
                                {balance.asset}
                              </div>
                              <div className="text-xs text-base-content/60">
                                Total: {formatBalance(balance.total)}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-xl text-primary">
                                {balance.usdValue !== null ? formatPrice(balance.usdValue) : (
                                  pricesLoading ? (
                                    <span className="loading loading-dots loading-sm"></span>
                                  ) : '—'
                                )}
                              </div>
                              <div className="text-xs text-base-content/60">
                                Free: {formatBalance(balance.free)} • Locked: {formatBalance(balance.locked)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  })()}

                  {/* Summary */}
                  <div className="divider"></div>
                  <div className="text-sm text-base-content/70 text-center">
                    Showing balances over ${MIN_USD_VALUE_FILTER} USD
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Margin Balance Card - Full Width */}
        <div className="card bg-base-100 shadow-xl mt-6">
          <div className="card-body">
            <div className="flex items-center justify-between mb-4">
              <h2 className="card-title flex items-center gap-2">
                <Scale className="w-6 h-6 text-warning" />
                Margin Account
              </h2>
              <button
                onClick={() => refetchMargin()}
                className="btn btn-ghost btn-sm btn-circle"
                disabled={marginLoading}
              >
                <RefreshCw
                  className={`w-4 h-4 ${marginLoading ? 'animate-spin' : ''}`}
                />
              </button>
            </div>

            {marginLoading && (
              <div className="flex items-center justify-center py-12">
                <span className="loading loading-spinner loading-lg text-warning"></span>
              </div>
            )}

            {marginError && (
              <div className="alert alert-error">
                <AlertCircle className="w-5 h-5" />
                <span>
                  Failed to load margin balances: {(marginError).message}
                </span>
              </div>
            )}

            {marginBalances && (
              <div className="space-y-4">
                {/* Exchange Info */}
                <div className="badge badge-outline badge-lg badge-warning">
                  {marginBalances.exchange} Margin
                </div>

                {/* Margin Balance List */}
                {marginBalances.count === 0 ? (
                  <div className="text-center py-8 text-base-content/60">
                    No margin positions
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="table table-zebra">
                      <thead>
                        <tr>
                          <th>Asset</th>
                          <th className="text-right">Free</th>
                          <th className="text-right">Locked</th>
                          <th className="text-right">Borrowed</th>
                          <th className="text-right">Interest</th>
                          <th className="text-right">Net Asset</th>
                          <th className="text-right">USD Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {marginBalances.balances.map((balance) => {
                          const usdValue = getMarginUsdValue(balance.asset, balance.netAsset)
                          return (
                            <tr key={balance.asset}>
                              <td className="font-bold">{balance.asset}</td>
                              <td className="text-right">{formatBalance(balance.free)}</td>
                              <td className="text-right">{formatBalance(balance.locked)}</td>
                              <td className="text-right text-error">
                                {balance.borrowed > 0 ? `-${formatBalance(balance.borrowed)}` : '0'}
                              </td>
                              <td className="text-right text-error">
                                {balance.interest > 0 ? `-${formatBalance(balance.interest)}` : '0'}
                              </td>
                              <td className={`text-right font-bold ${balance.netAsset >= 0 ? 'text-success' : 'text-error'}`}>
                                {formatBalance(balance.netAsset)}
                              </td>
                              <td className={`text-right font-bold ${usdValue !== null && usdValue >= 0 ? 'text-primary' : 'text-error'}`}>
                                {usdValue !== null ? formatPrice(usdValue) : (
                                  marginPricesLoading ? (
                                    <span className="loading loading-dots loading-xs"></span>
                                  ) : '—'
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Summary */}
                <div className="text-sm text-base-content/70 text-center">
                  {marginBalances.count} asset{marginBalances.count === 1 ? '' : 's'} in margin account
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Info Banner */}
        <div className="alert alert-info shadow-lg mt-8">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            className="stroke-current flex-shrink-0 w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            ></path>
          </svg>
          <span>
            Data refreshes automatically. Prices update every 5 seconds.
          </span>
        </div>
      </div>
    </div>
  )
}
