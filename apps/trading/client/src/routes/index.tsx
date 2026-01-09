import { DndContext, DragOverlay } from '@dnd-kit/core'
import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useMemo, useRef, useState } from 'react'

import { detectStopOrderCategory } from '@platform/trading-domain'
import { DragOrderPanel } from '../components/DragOrderPanel'
import { DragOverlayBadge } from '../components/DragOverlayBadge'
import { MarginAccountCard } from '../components/MarginAccountCard'
import { OrdersTable } from '../components/OrdersTable'
import { PortfolioSummaryCard } from '../components/PortfolioSummaryCard'
import { SpotBalancesCard } from '../components/SpotBalancesCard'
import { StopPriceModal } from '../components/StopPriceModal'
import { TradingChart } from '../components/TradingChart'
import { useCurrentPrice } from '../hooks/useCurrentPrice'
import { useDragOrder } from '../hooks/useDragOrder'
import { useFetchOrderHistory } from '../hooks/useFetchOrderHistory'
import { useOrderAmounts } from '../hooks/useOrderAmounts'
import { useOrderManagement } from '../hooks/useOrderManagement'
import { useOrderMode } from '../hooks/useOrderMode'
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
    quoteBalance,
    tradingSymbol
  )

  // Order mode state (stop_limit or limit)
  const { orderMode, setOrderMode } = useOrderMode()

  // Stop price modal state
  const [stopMarketModal, setStopMarketModal] = useState<{
    isOpen: boolean
    side: 'buy' | 'sell'
  }>({ isOpen: false, side: 'buy' })

  // Order CRUD operations and real-time updates
  const { placedOrders, createOrder, cancelOrder, isAuthenticated } = useOrderManagement(
    chartRef,
    tradingData.refetch
  )

  // Fetch order history for the current symbol
  const { data: orderHistoryData } = useFetchOrderHistory(tradingSymbol, isAuthenticated)

  // Transform order history data for the chart
  const orderHistory = useMemo(() => {
    if (!orderHistoryData) return []
    return orderHistoryData
      .filter((o) => o.price !== undefined)
      .map((o) => ({
        id: o.id,
        side: o.side,
        price: o.price!,
        time: Math.floor(new Date(o.updatedAt).getTime() / 1000), // Use updatedAt (fill time) not createdAt
      }))
  }, [orderHistoryData])

  // Handle stop-market order confirmation from modal
  const handleStopMarketConfirm = useCallback(
    (stopPrice: number) => {
      const side = stopMarketModal.side
      const quantity = side === 'buy' ? buyAmount : sellAmount

      // Detect stop order category (stop_loss or take_profit)
      const category = detectStopOrderCategory(side, stopPrice, currentPrice)
      const orderType = category === 'stop_loss' ? 'stop_loss' : 'take_profit'

      createOrder(
        {
          symbol: tradingSymbol,
          side,
          type: orderType,
          quantity,
          stopPrice,
        },
        {
          onError: (error) => {
            alert(`Failed to create order: ${error.message}`)
          },
        }
      )

      setStopMarketModal({ isOpen: false, side: 'buy' })
    },
    [stopMarketModal.side, buyAmount, sellAmount, currentPrice, tradingSymbol, createOrder]
  )

  // Handle buy button click (opens stop-market modal in stop mode)
  const handleBuyClick = useCallback(() => {
    if (orderMode === 'stop_limit') {
      setStopMarketModal({ isOpen: true, side: 'buy' })
    }
  }, [orderMode])

  // Handle sell button click (opens stop-market modal in stop mode)
  const handleSellClick = useCallback(() => {
    if (orderMode === 'stop_limit') {
      setStopMarketModal({ isOpen: true, side: 'sell' })
    }
  }, [orderMode])

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
    orderMode,
    currentPrice,
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
            selectedAsset={selectedAsset}
            onAssetSelect={handleAssetSelect}
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
            orders={placedOrders
              .filter(
                (o) =>
                  o.symbol === tradingSymbol &&
                  (o.status === 'pending' || o.status === 'partially_filled')
              )
              .map((o) => ({ id: o.id, side: o.side, price: o.price, quantity: o.quantity }))}
            orderHistory={orderHistory}
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
            orderMode={orderMode}
            onOrderModeChange={setOrderMode}
            onBuyClick={handleBuyClick}
            onSellClick={handleSellClick}
            isAuthenticated={isAuthenticated}
          />

          <OrdersTable orders={placedOrders} onCancelOrder={cancelOrder} />

          {/* <OrderCard
            baseAsset={baseAsset}
            quoteAsset={quoteAsset}
            currentPrice={currentPrice}
            quoteBalance={quoteBalance}
            baseBalance={baseBalance}
            marginLevel={1.89}
            leverage="3x"
          /> */}
        </div>
      </section>

      {/* Drag overlay for visual feedback */}
      <DragOverlay>
        {activeDragId && (
          <DragOverlayBadge side={activeDragId === 'drag-buy' ? 'buy' : 'sell'} />
        )}
      </DragOverlay>

      {/* Stop Price Modal for stop-market orders */}
      <StopPriceModal
        isOpen={stopMarketModal.isOpen}
        side={stopMarketModal.side}
        currentPrice={currentPrice}
        quantity={stopMarketModal.side === 'buy' ? buyAmount : sellAmount}
        baseAsset={baseAsset}
        onConfirm={handleStopMarketConfirm}
        onCancel={() => setStopMarketModal({ isOpen: false, side: 'buy' })}
      />
    </DndContext>
  )
}
