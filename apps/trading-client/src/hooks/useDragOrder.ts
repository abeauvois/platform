import { PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { useCallback, useState } from 'react'

import type { DragEndEvent, DragMoveEvent, DragStartEvent } from '@dnd-kit/core'
import type { RefObject } from 'react'

import type { TradingChartHandle } from '../components/TradingChart'
import type { CreateOrderParams } from './useOrderManagement'
import type { OrderMode } from './useOrderMode'
import type { AccountMode } from './useAccountMode'

import {
  getPricePrecision,
  getQuantityPrecision,
  roundToPrecision,
  validateBalance,
  validateOrderValue,
} from '../utils/order'
import { detectStopOrderCategory } from '@abeauvois/platform-trading-domain'

// Maximum order value in USD
const MAX_ORDER_VALUE = 500

export interface UseDragOrderConfig {
  chartRef: RefObject<TradingChartHandle | null>
  tradingSymbol: string
  baseAsset: string
  quoteAsset: string
  buyAmount: number
  sellAmount: number
  baseBalance: number
  baseLockedBalance: number
  quoteBalance: number
  quoteLockedBalance: number
  /** Order mode: 'stop_limit' creates stop-limit orders, 'limit' creates regular limit orders */
  orderMode: OrderMode
  /** Account mode: 'spot' or 'margin' */
  accountMode: AccountMode
  /** Current market price (needed for stop order type detection) */
  currentPrice: number
  /** Max borrowable for base asset (for margin short selling) */
  maxBorrowableBase?: number
  /** Max borrowable for quote asset (for margin leveraged buying) */
  maxBorrowableQuote?: number
  createOrder: (
    params: CreateOrderParams,
    callbacks?: {
      onSuccess?: () => void
      onError?: (error: Error) => void
    }
  ) => void
}

export interface UseDragOrderReturn {
  /** Configured sensors for DndContext */
  sensors: ReturnType<typeof useSensors>
  /** ID of the currently dragged item (null if not dragging) */
  activeDragId: string | null
  /** Handler for drag start */
  handleDragStart: (event: DragStartEvent) => void
  /** Handler for drag move (shows preview line on chart) */
  handleDragMove: (event: DragMoveEvent) => void
  /** Handler for drag end (places order at drop position) */
  handleDragEnd: (event: DragEndEvent) => void
}

/**
 * Hook to manage drag-and-drop order placement
 *
 * Handles:
 * - DnD sensor configuration
 * - Preview line display during drag
 * - Order validation and placement on drop
 * - Stop-limit vs limit order creation based on orderMode
 */
export function useDragOrder(config: UseDragOrderConfig): UseDragOrderReturn {
  const {
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
    maxBorrowableBase = 0,
    maxBorrowableQuote = 0,
    createOrder,
  } = config

  const [activeDragId, setActiveDragId] = useState<string | null>(null)

  // Configure sensors with activation distance
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  // Handle drag start
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragId(String(event.active.id))
  }, [])

  // Handle drag move - show preview line on chart
  const handleDragMove = useCallback(
    (event: DragMoveEvent) => {
      const { active } = event
      const side = active.data.current?.side as 'buy' | 'sell' | undefined
      if (!side) return

      // Calculate current Y position
      const deltaY = event.delta.y
      const currentY =
        event.activatorEvent instanceof MouseEvent ? event.activatorEvent.clientY + deltaY : 0

      const price = chartRef.current?.getPriceAtY(currentY)
      if (price && price > 0) {
        chartRef.current?.showPreviewLine(price, side)
      }
    },
    [chartRef]
  )

  // Handle drag end - place order at drop position
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveDragId(null)
      chartRef.current?.hidePreviewLine()

      const { active, over } = event
      console.log('[DragOrder] active:', active.id, 'over:', over?.id)

      // Check if dropped over the chart
      if (!over || over.id !== 'trading-chart-drop-zone') {
        console.log('[DragOrder] Not dropped on chart, aborting')
        return
      }

      // Get the side from the dragged button
      const side = active.data.current?.side as 'buy' | 'sell' | undefined
      if (!side) return

      // Get the price at the drop position
      const deltaY = event.delta.y
      const dropY =
        event.activatorEvent instanceof MouseEvent ? event.activatorEvent.clientY + deltaY : 0

      console.log('[DragOrder] deltaY:', deltaY, 'dropY:', dropY)

      const rawPrice = chartRef.current?.getPriceAtY(dropY)
      console.log('[DragOrder] Calculated price:', rawPrice)

      if (!rawPrice || rawPrice <= 0) {
        console.warn('[DragOrder] Invalid price, aborting order')
        return
      }

      // Round price and quantity to appropriate precision for Binance
      const dragPrice = roundToPrecision(rawPrice, getPricePrecision(rawPrice))
      const orderAmount = side === 'buy' ? buyAmount : sellAmount
      const quantity = roundToPrecision(orderAmount, getQuantityPrecision(rawPrice))

      // Validate order amount
      const valueValidation = validateOrderValue(quantity, dragPrice, MAX_ORDER_VALUE)
      if (!valueValidation.valid) {
        console.warn('[DragOrder]', valueValidation.error)
        alert(valueValidation.error)
        return
      }

      // For BUY orders, check if we have enough quote balance (+ borrowable in margin mode)
      if (side === 'buy') {
        const orderValue = quantity * dragPrice
        // In margin mode, add borrowable amount to available balance
        const effectiveQuoteBalance = accountMode === 'margin'
          ? quoteBalance + maxBorrowableQuote
          : quoteBalance
        const balanceValidation = validateBalance(
          orderValue,
          effectiveQuoteBalance,
          quoteAsset,
          quoteLockedBalance
        )
        if (!balanceValidation.valid) {
          console.warn('[DragOrder]', balanceValidation.error)
          alert(balanceValidation.error)
          return
        }
      }

      // For SELL orders, check if we have enough base balance (+ borrowable in margin mode for short selling)
      if (side === 'sell') {
        // In margin mode, add borrowable amount to available balance (short selling)
        const effectiveBaseBalance = accountMode === 'margin'
          ? baseBalance + maxBorrowableBase
          : baseBalance
        const balanceValidation = validateBalance(
          quantity,
          effectiveBaseBalance,
          baseAsset,
          baseLockedBalance
        )
        if (!balanceValidation.valid) {
          console.warn('[DragOrder]', balanceValidation.error)
          alert(balanceValidation.error)
          return
        }
      }

      // Determine order type and prices based on mode
      let orderType: CreateOrderParams['type']
      let orderPrice: number | undefined
      let stopPrice: number | undefined

      if (orderMode === 'stop_limit') {
        // Stop-limit mode: drag position is the stop price
        const category = detectStopOrderCategory(side, dragPrice, currentPrice)
        orderType = category === 'stop_loss' ? 'stop_loss_limit' : 'take_profit_limit'
        stopPrice = dragPrice

        // Set limit price slightly beyond stop to ensure fill
        // For BUY: limit price slightly above stop (willing to pay more)
        // For SELL: limit price slightly below stop (willing to accept less)
        const slippage = 0.001 // 0.1% slippage tolerance
        orderPrice = side === 'buy'
          ? roundToPrecision(dragPrice * (1 + slippage), getPricePrecision(dragPrice))
          : roundToPrecision(dragPrice * (1 - slippage), getPricePrecision(dragPrice))

        console.log('[DragOrder] Stop-limit order:', {
          category,
          orderType,
          stopPrice,
          orderPrice,
        })
      } else {
        // Regular limit mode
        orderType = 'limit'
        orderPrice = dragPrice
      }

      const orderValue = quantity * dragPrice
      console.log('[DragOrder] Creating order:', {
        symbol: tradingSymbol,
        side,
        type: orderType,
        quantity,
        price: orderPrice,
        stopPrice,
        value: orderValue.toFixed(2),
        quoteBalance,
        baseBalance,
      })

      // Create the order
      createOrder(
        {
          symbol: tradingSymbol,
          side,
          type: orderType,
          quantity,
          price: orderPrice,
          stopPrice,
          isMarginOrder: accountMode === 'margin',
        },
        {
          onError: (error) => {
            alert(`Failed to create order: ${error.message}`)
          },
        }
      )
    },
    [
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
    ]
  )

  return {
    sensors,
    activeDragId,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
  }
}
