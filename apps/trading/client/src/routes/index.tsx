import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, RefreshCw, TrendingUp, Wallet } from 'lucide-react'
import { tradingClient } from '../lib/trading-client'
import { TradingChart } from '../components/TradingChart'

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

function HomePage() {
  // Fetch BTC/USD ticker data
  const {
    data: ticker,
    isLoading: tickerLoading,
    error: tickerError,
    refetch: refetchTicker,
  } = useQuery({
    queryKey: ['ticker'],
    queryFn: () => tradingClient.getTicker(),
    refetchInterval: 5000, // Refresh every 5 seconds
  })

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
            Monitor your BTC/USD positions and account balance
          </p>
        </div>

        {/* Trading Chart - Full Width */}
        <div className="mb-6">
          <TradingChart symbol="BTCUSDT" interval="1h" limit={100} />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* BTC/USD Ticker Card */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <div className="flex items-center justify-between mb-4">
                <h2 className="card-title flex items-center gap-2">
                  <TrendingUp className="w-6 h-6 text-primary" />
                  BTC/USD Ticker
                </h2>
                <button
                  onClick={() => refetchTicker()}
                  className="btn btn-ghost btn-sm btn-circle"
                  disabled={tickerLoading}
                >
                  <RefreshCw
                    className={`w-4 h-4 ${tickerLoading ? 'animate-spin' : ''}`}
                  />
                </button>
              </div>

              {tickerLoading && !ticker && (
                <div className="flex items-center justify-center py-12">
                  <span className="loading loading-spinner loading-lg text-primary"></span>
                </div>
              )}

              {tickerError && (
                <div className="alert alert-error">
                  <AlertCircle className="w-5 h-5" />
                  <span>
                    Failed to load ticker: {(tickerError as Error).message}
                  </span>
                </div>
              )}

              {ticker && (
                <div className="space-y-4">
                  {/* Current Price */}
                  <div className="text-center py-4">
                    <div className="text-5xl font-bold text-primary">
                      {formatPrice(ticker.lastPrice)}
                    </div>
                    <div className="text-sm text-base-content/60 mt-2">
                      {ticker.symbol}
                    </div>
                  </div>

                  {/* Price Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="stat bg-base-200 rounded-lg p-4">
                      <div className="stat-title text-xs">24h High</div>
                      <div className="stat-value text-lg text-success">
                        {formatPrice(ticker.highPrice)}
                      </div>
                    </div>
                    <div className="stat bg-base-200 rounded-lg p-4">
                      <div className="stat-title text-xs">24h Low</div>
                      <div className="stat-value text-lg text-error">
                        {formatPrice(ticker.lowPrice)}
                      </div>
                    </div>
                  </div>

                  {/* Volume & Change */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="stat bg-base-200 rounded-lg p-4">
                      <div className="stat-title text-xs">24h Volume</div>
                      <div className="stat-value text-sm">
                        {formatBalance(ticker.volume ?? 0)} BTC
                      </div>
                    </div>
                    <div className="stat bg-base-200 rounded-lg p-4">
                      <div className="stat-title text-xs">24h Change</div>
                      <div
                        className={`stat-value text-sm ${(ticker.priceChangePercent ?? 0) >= 0
                          ? 'text-success'
                          : 'text-error'
                          }`}
                      >
                        {(ticker.priceChangePercent ?? 0) >= 0 ? '+' : ''}
                        {(ticker.priceChangePercent ?? 0).toFixed(2)}%
                      </div>
                    </div>
                  </div>

                  {/* Last Update */}
                  <div className="text-xs text-base-content/50 text-center">
                    Last updated: {ticker.timestamp.toLocaleTimeString()}
                  </div>
                </div>
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

              {balancesLoading && !balances && (
                <div className="flex items-center justify-center py-12">
                  <span className="loading loading-spinner loading-lg text-secondary"></span>
                </div>
              )}

              {balancesError && (
                <div className="alert alert-error">
                  <AlertCircle className="w-5 h-5" />
                  <span>
                    Failed to load balances:{' '}
                    {(balancesError as Error).message}
                  </span>
                </div>
              )}

              {balances && (
                <div className="space-y-4">
                  {/* Exchange Info */}
                  <div className="badge badge-outline badge-lg">
                    {balances.exchange}
                  </div>

                  {/* Balance List */}
                  {balances.count === 0 ? (
                    <div className="text-center py-8 text-base-content/60">
                      No balances available
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {balances.balances.map((balance) => (
                        <div
                          key={balance.asset}
                          className="flex items-center justify-between p-4 bg-base-200 rounded-lg hover:bg-base-300 transition-colors"
                        >
                          <div>
                            <div className="font-bold text-lg">
                              {balance.asset}
                            </div>
                            <div className="text-xs text-base-content/60">
                              Free: {formatBalance(balance.free)} •
                              Locked: {formatBalance(balance.locked)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-xl">
                              {formatBalance(balance.total)}
                            </div>
                            <div className="text-xs text-base-content/60">
                              Total
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Summary */}
                  <div className="divider"></div>
                  <div className="text-sm text-base-content/70 text-center">
                    Showing {balances.count} asset{balances.count !== 1 ? 's' : ''}{' '}
                    with balance
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="alert alert-info shadow-lg mt-8">
          <div>
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
              Data refreshes automatically. Ticker updates every 5 seconds, balances
              every 10 seconds.
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
