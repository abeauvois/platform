import { DndContext, DragOverlay } from '@dnd-kit/core'
import { createFileRoute } from '@tanstack/react-router'
import { useRef } from 'react'

import { DragOrderPanel } from '../components/DragOrderPanel'
import { DragOverlayBadge } from '../components/DragOverlayBadge'
import { MarginAccountCard } from '../components/MarginAccountCard'
import { OrderCard } from '../components/OrderCard'
import { OrdersTable } from '../components/OrdersTable'
import { PortfolioSummaryCard } from '../components/PortfolioSummaryCard'
import { SpotBalancesCard } from '../components/SpotBalancesCard'
import { TradingChart } from '../components/TradingChart'
import { useCurrentPrice } from '../hooks/useCurrentPrice'
import { useDragOrder } from '../hooks/useDragOrder'
import { useOrderAmounts } from '../hooks/useOrderAmounts'
import { useOrderManagement } from '../hooks/useOrderManagement'
import { useSelectedAsset } from '../hooks/useSelectedAsset'
import { useTradingBalances } from '../hooks/useTradingBalances'
import { useTradingData } from '../hooks/useTradingData'

import type { TradingChartHandle } from '../components/TradingChart'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  const tradingData = useTradingData()
  const chartRef = useRef<TradingChartHandle>(null)

  // Asset selection and trading pair configuration
  const { selectedAsset, baseAsset, quoteAsset, tradingSymbol, handleAssetSelect } =
    useSelectedAsset()

  // Balances for the trading pair
  const { baseBalance, baseLockedBalance, quoteBalance, quoteLockedBalance } = useTradingBalances(
    baseAsset,
    quoteAsset,
    tradingData
  )

  // Current price synced from prices map
  const currentPrice = useCurrentPrice(baseAsset, tradingData.prices)

  // Order amounts with auto-calculated defaults
  const { buyAmount, sellAmount, setBuyAmount, setSellAmount } = useOrderAmounts(
    currentPrice,
    baseBalance,
    quoteBalance
  )

  // Order CRUD operations and real-time updates
  const { placedOrders, createOrder, cancelOrder } = useOrderManagement(
    chartRef,
    tradingData.refetch
  )

  // Drag-and-drop order placement
  const { sensors, activeDragId, handleDragStart, handleDragMove, handleDragEnd } = useDragOrder({
    chartRef,
    tradingSymbol,
    baseAsset,
    quoteAsset,
    buyAmount,
    sellAmount,
    baseBalance,
    baseLockedBalance,
    quoteBalance,
    quoteLockedBalance,
    createOrder,
  })

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
    >
      <section className="flex gap-4 h-full">
        {/* Left Column - Portfolio Summary */}
        <div className="w-80 flex flex-col gap-3">
          <PortfolioSummaryCard
            spotValue={tradingData.spotTotalValue}
            marginValue={tradingData.marginTotalValue}
            spotCount={tradingData.spotCount}
            marginCount={tradingData.marginCount}
            isLoading={tradingData.isPricesLoading}
          />

          <SpotBalancesCard
            balances={tradingData.spotBalances}
            prices={tradingData.prices}
            priceChanges={tradingData.priceChanges}
            exchange={tradingData.spotExchange}
            isLoading={tradingData.isBalancesLoading}
            isPricesLoading={tradingData.isPricesLoading}
            error={tradingData.spotError}
            refetch={tradingData.refetch}
            selectedAsset={selectedAsset}
            onAssetSelect={handleAssetSelect}
          />

          <MarginAccountCard
            balances={tradingData.marginBalances}
            prices={tradingData.prices}
            priceChanges={tradingData.priceChanges}
            exchange={tradingData.marginExchange}
            count={tradingData.marginCount}
            isLoading={tradingData.isBalancesLoading}
            isPricesLoading={tradingData.isPricesLoading}
            error={tradingData.marginError}
            refetch={tradingData.refetch}
          />
        </div>

        {/* Right Column - Chart, Drag Panel, Orders Table, and Order Card */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          <TradingChart
            ref={chartRef}
            symbol={tradingSymbol}
            interval="1h"
            limit={100}
            currentPrice={currentPrice}
            lastUpdate={tradingData.lastUpdate}
            orders={placedOrders
              .filter(
                (o) =>
                  o.symbol === tradingSymbol &&
                  (o.status === 'pending' || o.status === 'partially_filled')
              )
              .map((o) => ({ id: o.id, side: o.side, price: o.price, quantity: o.quantity }))}
          />

          <DragOrderPanel
            symbol={tradingSymbol}
            baseAsset={baseAsset}
            quoteAsset={quoteAsset}
            availableBase={baseBalance}
            availableQuote={quoteBalance}
            currentPrice={currentPrice}
            buyAmount={buyAmount}
            sellAmount={sellAmount}
            onBuyAmountChange={setBuyAmount}
            onSellAmountChange={setSellAmount}
          />

          <OrdersTable orders={placedOrders} onCancelOrder={cancelOrder} />

          <OrderCard
            baseAsset={baseAsset}
            quoteAsset={quoteAsset}
            currentPrice={currentPrice}
            quoteBalance={quoteBalance}
            baseBalance={baseBalance}
            marginLevel={1.89}
            leverage="3x"
          />
        </div>
      </section>

      {/* Drag overlay for visual feedback */}
      <DragOverlay>
        {activeDragId && (
          <DragOverlayBadge side={activeDragId === 'drag-buy' ? 'buy' : 'sell'} />
        )}
      </DragOverlay>
    </DndContext>
  )
}
