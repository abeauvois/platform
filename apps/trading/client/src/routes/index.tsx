import { Alert, AlertDescription, AlertTitle } from '@platform/ui'
import { createFileRoute } from '@tanstack/react-router'
import { Info } from 'lucide-react'

import { MarginAccountCard } from '../components/MarginAccountCard'
import { PortfolioSummaryCard } from '../components/PortfolioSummaryCard'
import { SpotBalancesCard } from '../components/SpotBalancesCard'
import { TradingChart } from '../components/TradingChart'
import { useMarginBalances, useSpotBalances } from '../hooks/useBalances'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  const spot = useSpotBalances()
  const margin = useMarginBalances()

  return (
    <div className="min-h-screen bg-muted">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Trading Dashboard
          </h1>
          <p className="text-muted-foreground">
            Monitor your portfolio value and account balances
          </p>
        </div>

        {/* Trading Chart - Full Width */}
        <div className="mb-6">
          <TradingChart symbol="BTCUSDT" interval="1h" limit={100} />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Global Portfolio Value Card */}
          <PortfolioSummaryCard
            spotValue={spot.totalValue}
            marginValue={margin.totalValue}
            spotCount={spot.count}
            marginCount={margin.count}
            isLoading={spot.isPricesLoading || margin.isPricesLoading}
          />

          {/* Account Balance Card */}
          <SpotBalancesCard
            balances={spot.balances}
            prices={spot.prices}
            exchange={spot.exchange}
            isLoading={spot.isLoading}
            isPricesLoading={spot.isPricesLoading}
            error={spot.error}
            refetch={spot.refetch}
          />
        </div>

        {/* Margin Balance Card - Full Width */}
        <div className="mt-6">
          <MarginAccountCard
            balances={margin.balances}
            prices={margin.prices}
            exchange={margin.exchange}
            count={margin.count}
            isLoading={margin.isLoading}
            isPricesLoading={margin.isPricesLoading}
            error={margin.error}
            refetch={margin.refetch}
          />
        </div>

        {/* Info Banner */}
        <Alert className="mt-8">
          <Info />
          <AlertTitle>Auto-refresh enabled</AlertTitle>
          <AlertDescription>
            Data refreshes automatically. Prices update every 5 seconds.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  )
}
