import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useEffect, useRef, useState } from 'react'

import { DragOrderPanel } from '../components/DragOrderPanel'
import { MarginAccountCard } from '../components/MarginAccountCard'
import { OrderCard } from '../components/OrderCard'
import { OrdersTable } from '../components/OrdersTable'
import { PortfolioSummaryCard } from '../components/PortfolioSummaryCard'
import { SpotBalancesCard } from '../components/SpotBalancesCard'
import { TradingChart } from '../components/TradingChart'
import { useCreateOrder } from '../hooks/useCreateOrder'
import { useOrderUpdates } from '../hooks/useOrderUpdates'
import { useTradingData } from '../hooks/useTradingData'

import type { DragEndEvent, DragMoveEvent } from '@dnd-kit/core'
import type { OrderUpdateEvent } from '../hooks/useOrderUpdates'
import type { PlacedOrder } from '../components/OrdersTable'
import type { TradingChartHandle } from '../components/TradingChart'

export const Route = createFileRoute('/')({
  component: HomePage,
})

// Default quote asset for trading pairs (USDC for EU compliance)
const DEFAULT_QUOTE_ASSET = 'USDC'
const DEFAULT_BASE_ASSET = 'BTC'

// Strip "LD" prefix from symbols (e.g., "LDBANANAS31" -> "BANANAS31")
const normalizeAsset = (asset: string): string => {
  return asset.startsWith('LD') ? asset.slice(2) : asset
}

function HomePage() {
  const tradingData = useTradingData()
  const createOrder = useCreateOrder()
  const chartRef = useRef<TradingChartHandle>(null)

  // State for selected trading asset
  const [selectedAsset, setSelectedAsset] = useState(DEFAULT_BASE_ASSET)

  // Derived trading configuration based on selected asset
  // Normalize asset to strip "LD" prefix (e.g., "LDBANANAS31" -> "BANANAS31")
  const baseAsset = normalizeAsset(selectedAsset)
  const quoteAsset = DEFAULT_QUOTE_ASSET
  const tradingSymbol = `${baseAsset}${quoteAsset}`

  // State for order placement
  const [buyAmount, setBuyAmount] = useState(0)
  const [sellAmount, setSellAmount] = useState(0)
  const [placedOrders, setPlacedOrders] = useState<Array<PlacedOrder>>([])
  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  const [currentPrice, setCurrentPrice] = useState(0)

  // Get balances for the trading pair
  // Use 'free' balance (available to trade, not locked in orders)
  const spotBaseData = tradingData.spotBalances.find(b => normalizeAsset(b.asset) === baseAsset)
  const marginBaseData = tradingData.marginBalances.find(b => normalizeAsset(b.asset) === baseAsset)
  const baseBalance = Math.max(spotBaseData?.free ?? 0, marginBaseData?.free ?? 0)
  const baseLockedBalance = (spotBaseData?.locked ?? 0) + (marginBaseData?.locked ?? 0)

  const spotQuoteData = tradingData.spotBalances.find(b => normalizeAsset(b.asset) === quoteAsset)
  const marginQuoteData = tradingData.marginBalances.find(b => normalizeAsset(b.asset) === quoteAsset)
  const quoteBalance = Math.max(spotQuoteData?.free ?? 0, marginQuoteData?.free ?? 0)
  const quoteLockedBalance = (spotQuoteData?.locked ?? 0) + (marginQuoteData?.locked ?? 0)

  // Get current price from prices map
  // Note: prices are stored with USDT suffix (e.g., BTCUSDT) from Binance API
  useEffect(() => {
    const priceKey = `${baseAsset}USDT`
    const price = tradingData.prices.get(priceKey)
    if (price) {
      setCurrentPrice(price)
    }
  }, [tradingData.prices, baseAsset])

  // Calculate default amounts when asset or price changes
  // Default = min($500 worth / price, 25% of available balance)
  const MAX_ORDER_VALUE_USD = 500

  useEffect(() => {
    if (currentPrice > 0) {
      // For BUY: use quote balance (USDC) to calculate max buy amount
      const maxBuyByValue = MAX_ORDER_VALUE_USD / currentPrice
      const maxBuyByBalance = quoteBalance / currentPrice
      const defaultBuy = Math.min(maxBuyByValue, maxBuyByBalance * 0.25)
      setBuyAmount(defaultBuy > 0 ? Math.floor(defaultBuy * 10000) / 10000 : 0)

      // For SELL: use base balance to calculate max sell amount
      const maxSellByValue = MAX_ORDER_VALUE_USD / currentPrice
      const defaultSell = Math.min(maxSellByValue, baseBalance * 0.25)
      setSellAmount(defaultSell > 0 ? Math.floor(defaultSell * 10000) / 10000 : 0)
    } else {
      setBuyAmount(0)
      setSellAmount(0)
    }
  }, [baseAsset, baseBalance, quoteBalance, currentPrice])

  // Handle asset selection from balance list
  const handleAssetSelect = useCallback((asset: string) => {
    // Don't select the quote asset itself
    if (asset === quoteAsset) {
      return
    }
    setSelectedAsset(asset)
  }, [quoteAsset])

  // Sensors for drag detection
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  // Handle drag start
  const handleDragStart = useCallback((event: { active: { id: string | number } }) => {
    setActiveDragId(String(event.active.id))
  }, [])

  // Handle drag move - show preview line on chart
  const handleDragMove = useCallback((event: DragMoveEvent) => {
    const { active } = event
    const side = active.data.current?.side as 'buy' | 'sell' | undefined
    if (!side) return

    // Calculate current Y position
    const deltaY = event.delta.y
    const currentY = event.activatorEvent instanceof MouseEvent
      ? event.activatorEvent.clientY + deltaY
      : 0

    const price = chartRef.current?.getPriceAtY(currentY)
    if (price && price > 0) {
      chartRef.current?.showPreviewLine(price, side)
    }
  }, [])

  // Handle drag end - place order at drop position
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveDragId(null)
    chartRef.current?.hidePreviewLine()

    const { active, over } = event
    console.log('[DragEnd] active:', active.id, 'over:', over?.id)

    // Check if dropped over the chart
    if (!over || over.id !== 'trading-chart-drop-zone') {
      console.log('[DragEnd] Not dropped on chart, aborting')
      return
    }

    // Get the side from the dragged button
    const side = active.data.current?.side as 'buy' | 'sell' | undefined
    if (!side) return

    // Get the price at the drop position
    const deltaY = event.delta.y
    const dropY = event.activatorEvent instanceof MouseEvent
      ? event.activatorEvent.clientY + deltaY
      : 0

    console.log('[DragEnd] deltaY:', deltaY, 'dropY:', dropY)

    const rawPrice = chartRef.current?.getPriceAtY(dropY)
    console.log('[DragEnd] Calculated price:', rawPrice)

    if (!rawPrice || rawPrice <= 0) {
      console.warn('[DragEnd] Invalid price, aborting order')
      return
    }

    // Round price and quantity to appropriate precision for Binance
    // Most trading pairs use 2 decimal places for price (tick size 0.01)
    // Sub-$1 assets may use more decimals
    const roundToPrecision = (value: number, decimals: number): number => {
      const multiplier = 10 ** decimals
      return Math.round(value * multiplier) / multiplier
    }

    // Price precision based on Binance tick sizes:
    // - Most pairs (SOL, ETH, etc.): 2 decimals (tick 0.01)
    // - BTC pairs: 2 decimals (tick 0.01)
    // - Very low value assets: may need more decimals
    const getPricePrecision = (p: number): number => {
      if (p >= 1) return 2      // Most assets: 2 decimals
      if (p >= 0.01) return 4   // Low value assets: 4 decimals
      return 6                  // Very low value: 6 decimals
    }

    // Quantity precision varies by asset:
    // - BTC: 5 decimals (step 0.00001)
    // - Most alts: 2-3 decimals
    const getQuantityPrecision = (p: number): number => {
      if (p >= 10000) return 5  // BTC-like: 5 decimals
      if (p >= 100) return 2    // Mid-value: 2 decimals
      return 1                  // Lower value: 1 decimal
    }

    const price = roundToPrecision(rawPrice, getPricePrecision(rawPrice))
    const orderAmount = side === 'buy' ? buyAmount : sellAmount
    const quantity = roundToPrecision(orderAmount, getQuantityPrecision(rawPrice))

    // Validate order amount
    if (orderAmount <= 0) {
      console.warn('[DragEnd] Order amount must be greater than 0')
      alert('Order amount must be greater than 0')
      return
    }

    // Validate order value (max $500 limit)
    const orderValue = quantity * price
    const MAX_ORDER_VALUE = 500
    if (orderValue > MAX_ORDER_VALUE) {
      console.warn(`[DragEnd] Order value $${orderValue.toFixed(2)} exceeds limit of $${MAX_ORDER_VALUE}`)
      alert(`Order value $${orderValue.toFixed(2)} exceeds limit of $${MAX_ORDER_VALUE}. Please reduce the amount.`)
      return
    }

    // For BUY orders, check if we have enough quote balance
    if (side === 'buy' && orderValue > quoteBalance) {
      const lockedMsg = quoteLockedBalance > 0 ? ` (${quoteLockedBalance.toFixed(2)} locked in orders)` : ''
      console.warn(`[DragEnd] Insufficient ${quoteAsset} balance. Need ${orderValue.toFixed(2)}, have ${quoteBalance.toFixed(2)} free${lockedMsg}`)
      alert(`Insufficient ${quoteAsset} balance.\nNeed: ${orderValue.toFixed(2)} ${quoteAsset}\nAvailable: ${quoteBalance.toFixed(2)} ${quoteAsset}${lockedMsg}\n\nCancel existing orders to free up funds.`)
      return
    }

    // For SELL orders, check if we have enough base balance
    if (side === 'sell' && quantity > baseBalance) {
      const lockedMsg = baseLockedBalance > 0 ? ` (${baseLockedBalance.toFixed(2)} locked in orders)` : ''
      console.warn(`[DragEnd] Insufficient ${baseAsset} balance. Need ${quantity}, have ${baseBalance} free${lockedMsg}`)
      alert(`Insufficient ${baseAsset} balance.\nNeed: ${quantity} ${baseAsset}\nAvailable: ${baseBalance} ${baseAsset}${lockedMsg}\n\nCancel existing orders to free up funds.`)
      return
    }

    console.log('[DragEnd] Creating order:', { symbol: tradingSymbol, side, type: 'limit', quantity, price, value: orderValue.toFixed(2), quoteBalance, baseBalance })

    // Create the order
    createOrder.mutate(
      {
        symbol: tradingSymbol,
        side,
        type: 'limit',
        quantity,
        price,
      },
      {
        onSuccess: (order) => {
          console.log('[DragEnd] Order created successfully:', order)
          // Add to placed orders list
          const newOrder: PlacedOrder = {
            id: order.id,
            symbol: order.symbol,
            side: order.side,
            price: order.price,
            quantity: order.quantity,
            status: order.status,
            createdAt: new Date(order.createdAt),
          }
          setPlacedOrders(prev => [newOrder, ...prev])

          // Add price line to chart
          chartRef.current?.addOrderLine({
            id: order.id,
            side: order.side,
            price: order.price,
          })
        },
        onError: (error) => {
          console.error('[DragEnd] Failed to create order:', error)
          alert(`Failed to create order: ${error.message}`)
        },
      }
    )
  }, [buyAmount, sellAmount, createOrder, tradingSymbol, quoteBalance, baseBalance, baseAsset, quoteAsset])

  // Handle order cancellation (placeholder - API not yet implemented)
  const handleCancelOrder = useCallback((orderId: string) => {
    // Remove from UI for now
    setPlacedOrders(prev => prev.filter(o => o.id !== orderId))
    chartRef.current?.removeOrderLine(orderId)
  }, [])

  // Handle real-time order updates from SSE stream
  const handleOrderUpdate = useCallback((event: OrderUpdateEvent) => {
    const { order } = event
    console.log('[OrderUpdate] Received:', order.status, order.id, order.symbol)

    setPlacedOrders(prev => {
      // Find and update the existing order
      const existingIndex = prev.findIndex(o => o.id === order.id)
      if (existingIndex === -1) {
        // New order we don't have locally - add it
        return [{
          id: order.id,
          symbol: order.symbol,
          side: order.side,
          price: order.price ?? 0,
          quantity: order.quantity,
          status: order.status,
          createdAt: new Date(order.createdAt),
        }, ...prev]
      }

      // Update existing order
      const updated = [...prev]
      updated[existingIndex] = {
        ...updated[existingIndex],
        status: order.status,
        quantity: order.filledQuantity > 0 ? order.filledQuantity : updated[existingIndex].quantity,
      }

      // Remove order line from chart if filled or cancelled
      if (order.status === 'filled' || order.status === 'cancelled' || order.status === 'rejected') {
        chartRef.current?.removeOrderLine(order.id)
      }

      return updated
    })

    // Refresh balances when order is filled
    if (order.status === 'filled' || order.status === 'partially_filled') {
      tradingData.refetch()
    }
  }, [tradingData])

  // Subscribe to real-time order updates
  useOrderUpdates(handleOrderUpdate)

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
          {/* Portfolio Value - fixed height */}
          <PortfolioSummaryCard
            spotValue={tradingData.spotTotalValue}
            marginValue={tradingData.marginTotalValue}
            spotCount={tradingData.spotCount}
            marginCount={tradingData.marginCount}
            isLoading={tradingData.isPricesLoading}
          />

          {/* Spot Balances - scrollable */}
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

          {/* Margin Balances - scrollable */}
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
              .filter(o => o.symbol === tradingSymbol && (o.status === 'pending' || o.status === 'partially_filled'))
              .map(o => ({ id: o.id, side: o.side, price: o.price }))
            }
          />

          {/* Drag Order Panel */}
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

          {/* Orders Table */}
          <OrdersTable
            orders={placedOrders}
            onCancelOrder={handleCancelOrder}
          />

          {/* Existing Order Card */}
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
          <div
            className={`px-8 py-6 rounded-lg text-xl font-bold text-white shadow-2xl ${
              activeDragId === 'drag-buy' ? 'bg-green-500' : 'bg-red-500'
            }`}
          >
            {activeDragId === 'drag-buy' ? 'BUY' : 'SELL'}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
