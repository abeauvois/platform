import { createFileRoute } from '@tanstack/react-router'

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
    <div className="flex gap-4 h-full">
      {/* Left Column - Portfolio Summary */}
      <div className="w-80 flex flex-col gap-3">
        {/* Portfolio Value - fixed height */}
        <PortfolioSummaryCard
          spotValue={spot.totalValue}
          marginValue={margin.totalValue}
          spotCount={spot.count}
          marginCount={margin.count}
          isLoading={spot.isPricesLoading || margin.isPricesLoading}
        />

        {/* Spot Balances - scrollable */}
        <SpotBalancesCard
          balances={spot.balances}
          prices={spot.prices}
          exchange={spot.exchange}
          isLoading={spot.isLoading}
          isPricesLoading={spot.isPricesLoading}
          error={spot.error}
          refetch={spot.refetch}
        />

        {/* Margin Balances - scrollable */}
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

      {/* Right Column - Chart */}
      <div className="flex-1 min-w-0">
        <TradingChart symbol="BTCUSDT" interval="1h" limit={100} />
      </div>
    </div>
  )
}
