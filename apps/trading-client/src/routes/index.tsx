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
import { WatchlistCard } from '../components/WatchlistCard'
import { useAccountMode } from '../hooks/useAccountMode'
import { useCurrentPrice } from '../hooks/useCurrentPrice'
import { useDragOrder } from '../hooks/useDragOrder'
import { useDragReferenceDate, SET_REFERENCE_DRAG_ID } from '../hooks/useDragReferenceDate'
import { useGlobalReference } from '../hooks/useGlobalReference'
import { useMarginAvailability } from '../hooks/useMarginAvailability'
import { useFetchOrderHistory } from '../hooks/useFetchOrderHistory'
import { useOrderAmounts } from '../hooks/useOrderAmounts'
import { useOrderManagement } from '../hooks/useOrderManagement'
import { useOrderMode } from '../hooks/useOrderMode'
import { useSelectedAsset } from '../hooks/useSelectedAsset'
import { useTradingBalances } from '../hooks/useTradingBalances'
import { useTradingData } from '../hooks/useTradingData'
import { useWatchlistActions } from '../hooks/useWatchlistActions'

import type { DragEndEvent, DragMoveEvent, DragStartEvent } from '@dnd-kit/core'
import type { TradingChartHandle } from '../components/TradingChart'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  const tradingData = useTradingData()
  const chartRef = useRef<TradingChartHandle>(null)

  // Get authentication status early (needed for useAccountMode)
  // Note: We'll get the full useOrderManagement later, but auth status is available from the hook
  const { isAuthenticated } = useOrderManagement(chartRef, tradingData.refetch)

  // Account mode state (spot vs margin) - syncs with server settings
  const { accountMode, setAccountMode } = useAccountMode(isAuthenticated)

  // Asset selection and trading pair configuration
  // When user selects from margin balance card, auto-switch to margin mode
  const { selectedAsset, baseAsset, quoteAsset, tradingSymbol, assetSource, handleAssetSelect } =
    useSelectedAsset({
      onSourceChange: (source) => {
        if (source === 'margin') {
          setAccountMode('margin')
        } else if (source === 'spot') {
          setAccountMode('spot')
        }
      },
    })

  // Chart interval state
  const [chartInterval, setChartInterval] = useState('1h')

  // Margin availability for leverage trading (short selling and leveraged buying)
  const { maxBorrowableBase, maxBorrowableQuote } = useMarginAvailability({
    baseAsset,
    quoteAsset,
    isAuthenticated,
    accountMode,
  })

  // Check if user has any margin balances
  const hasMarginBalance = tradingData.marginBalances.length > 0

  // Balances for the trading pair
  const { baseBalance, baseLockedBalance, quoteBalance, quoteLockedBalance } = useTradingBalances(
    baseAsset,
    quoteAsset,
    tradingData
  )

  // Current price synced from prices map
  const { price: currentPrice, asset: priceAsset } = useCurrentPrice(baseAsset, tradingData.prices)

  // Order amounts with auto-calculated defaults
  const { buyAmount, sellAmount, setBuyAmount, setSellAmount } = useOrderAmounts(
    currentPrice,
    baseBalance,
    quoteBalance,
    tradingSymbol,
    priceAsset
  )

  // Order mode state (stop_limit or limit)
  const { orderMode, setOrderMode } = useOrderMode()

  // Stop price modal state
  const [stopMarketModal, setStopMarketModal] = useState<{
    isOpen: boolean
    side: 'buy' | 'sell'
  }>({ isOpen: false, side: 'buy' })

  // Order CRUD operations and real-time updates
  // Note: isAuthenticated already extracted at top of component
  const { placedOrders, createOrder, cancelOrder } = useOrderManagement(
    chartRef,
    tradingData.refetch
  )

  // Fetch order history for the current symbol
  const { data: orderHistoryData } = useFetchOrderHistory(tradingSymbol, isAuthenticated)

  // Watchlist data and actions (consolidated hook)
  const {
    watchlistData,
    isWatchlistLoading,
    watchlistError,
    refetchWatchlist,
    isInWatchlist,
    handleAddToWatchlist,
    handleWatchlistSelect,
    handleWatchlistRemove,
  } = useWatchlistActions(tradingSymbol, isAuthenticated, handleAssetSelect)

  // Global reference timestamp - stored in user settings, persists across sessions
  const {
    globalReferenceTimestamp,
    setGlobalReference,
    clearGlobalReference,
  } = useGlobalReference(isAuthenticated)

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
          isMarginOrder: accountMode === 'margin',
        },
        {
          onError: (error) => {
            alert(`Failed to create order: ${error.message}`)
          },
        }
      )

      setStopMarketModal({ isOpen: false, side: 'buy' })
    },
    [stopMarketModal.side, buyAmount, sellAmount, currentPrice, tradingSymbol, createOrder, accountMode]
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
  const {
    sensors,
    activeDragId: orderDragId,
    handleDragStart: handleOrderDragStart,
    handleDragMove: handleOrderDragMove,
    handleDragEnd: handleOrderDragEnd,
  } = useDragOrder({
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
    accountMode,
    currentPrice,
    maxBorrowableBase,
    maxBorrowableQuote,
    createOrder,
  })

  // Drag-and-drop reference date selection (global reference for all watchlist items)
  const {
    activeDragId: refDragId,
    isReferenceDragActive,
    handleReferenceDragStart,
    handleReferenceDragMove,
    handleReferenceDragEnd,
  } = useDragReferenceDate({
    chartRef,
    onUpdateReference: setGlobalReference,
  })

  // Combined active drag ID for overlay
  const activeDragId = orderDragId || refDragId

  // Combined drag handlers
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      handleOrderDragStart(event)
      handleReferenceDragStart(event)
    },
    [handleOrderDragStart, handleReferenceDragStart]
  )

  const handleDragMove = useCallback(
    (event: DragMoveEvent) => {
      if (String(event.active.id) === SET_REFERENCE_DRAG_ID) {
        handleReferenceDragMove(event)
      } else {
        handleOrderDragMove(event)
      }
    },
    [handleOrderDragMove, handleReferenceDragMove]
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      if (String(event.active.id) === SET_REFERENCE_DRAG_ID) {
        handleReferenceDragEnd(event)
      } else {
        handleOrderDragEnd(event)
      }
    },
    [handleOrderDragEnd, handleReferenceDragEnd]
  )

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
            selectedAsset={assetSource === 'spot' ? selectedAsset : undefined}
            onAssetSelect={(asset) => handleAssetSelect(asset, 'spot')}
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
            selectedAsset={assetSource === 'margin' ? selectedAsset : undefined}
            onAssetSelect={(asset) => handleAssetSelect(asset, 'margin')}
          />
        </div>

        {/* Center Column - Chart, Drag Panel, Orders Table */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          <TradingChart
            ref={chartRef}
            symbol={tradingSymbol}
            interval={chartInterval}
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
            referenceTimestamp={globalReferenceTimestamp}
            isInWatchlist={isInWatchlist}
            onAddToWatchlist={isAuthenticated ? handleAddToWatchlist : undefined}
            onAssetSelect={handleAssetSelect}
            onIntervalChange={setChartInterval}
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
            accountMode={accountMode}
            onAccountModeChange={setAccountMode}
            hasMarginBalance={hasMarginBalance}
            onBuyClick={handleBuyClick}
            onSellClick={handleSellClick}
            isAuthenticated={isAuthenticated}
            maxBorrowableBase={maxBorrowableBase}
            maxBorrowableQuote={maxBorrowableQuote}
          />

          <OrdersTable orders={placedOrders} onCancelOrder={cancelOrder} />
        </div>

        {/* Right Column - Watchlist */}
        <div className="w-80 flex flex-col gap-3">
          <WatchlistCard
            watchlist={watchlistData}
            isLoading={isWatchlistLoading}
            error={watchlistError}
            refetch={refetchWatchlist}
            selectedSymbol={assetSource === 'watchlist' ? tradingSymbol : undefined}
            onSymbolSelect={handleWatchlistSelect}
            onRemoveSymbol={handleWatchlistRemove}
            onClearReference={clearGlobalReference}
          />
        </div>
      </section>

      {/* Drag overlay for visual feedback */}
      <DragOverlay>
        {activeDragId && !isReferenceDragActive && (
          <DragOverlayBadge side={activeDragId === 'drag-buy' ? 'buy' : 'sell'} />
        )}
        {isReferenceDragActive && (
          <div className="px-3 py-1.5 rounded-lg bg-blue-500/90 text-white text-sm font-medium shadow-lg">
            Set Reference
          </div>
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
