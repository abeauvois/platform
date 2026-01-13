import { useCallback, useEffect, useState } from 'react'

import { useCreateOrder } from './useCreateOrder'
import { useOrderUpdates } from './useOrderUpdates'
import { useFetchOrders } from './useFetchOrders'
import type { RefObject } from 'react'

import type { TradingChartHandle } from '../components/TradingChart'
import type { PlacedOrder } from '../components/OrdersTable'
import type { OrderUpdateEvent } from './useOrderUpdates'


export interface CreateOrderParams {
  symbol: string
  side: 'buy' | 'sell'
  type: 'limit' | 'market' | 'stop_loss' | 'stop_loss_limit' | 'take_profit' | 'take_profit_limit'
  quantity: number
  price?: number
  stopPrice?: number
  /** Whether to place order on margin account (default: false = spot) */
  isMarginOrder?: boolean
}

export interface UseOrderManagementReturn {
  /** List of placed orders */
  placedOrders: Array<PlacedOrder>
  /** Create a new order */
  createOrder: (
    params: CreateOrderParams,
    callbacks?: {
      onSuccess?: (order: PlacedOrder) => void
      onError?: (error: Error) => void
    }
  ) => void
  /** Cancel an order */
  cancelOrder: (orderId: string) => void
  /** Whether an order is being created */
  isCreating: boolean
  /** Whether the user is authenticated (required for trading) */
  isAuthenticated: boolean
}

/**
 * Hook to manage order CRUD operations and real-time updates
 *
 * Integrates useCreateOrder mutation and useOrderUpdates SSE stream.
 * Manages chart line updates via chartRef.
 * Fetches existing open orders on initialization to persist across page reloads.
 */
export function useOrderManagement(
  chartRef: RefObject<TradingChartHandle | null>,
  refetchBalances: () => void
): UseOrderManagementReturn {
  const [placedOrders, setPlacedOrders] = useState<Array<PlacedOrder>>([])
  const [hasInitialized, setHasInitialized] = useState(false)
  const createOrderMutation = useCreateOrder()

  // Fetch existing open orders on initialization (only when authenticated)
  const { data: fetchedOrders } = useFetchOrders(undefined, createOrderMutation.isAuthenticated)

  // Initialize placedOrders and chart order lines when orders are fetched
  useEffect(() => {
    if (fetchedOrders && !hasInitialized) {
      const orders: Array<PlacedOrder> = fetchedOrders.map((order) => ({
        id: order.id,
        symbol: order.symbol,
        side: order.side,
        type: order.type,
        price: order.price ?? 0,
        quantity: order.quantity,
        status: order.status,
        createdAt: new Date(order.createdAt),
      }))

      setPlacedOrders(orders)
      setHasInitialized(true)

      // Add order lines to chart for pending/partially_filled orders
      // Small delay to ensure chart is ready
      setTimeout(() => {
        for (const order of orders) {
          if (order.status === 'pending' || order.status === 'partially_filled') {
            chartRef.current?.addOrderLine({
              id: order.id,
              side: order.side,
              price: order.price,
              quantity: order.quantity,
            })
          }
        }
      }, 100)
    }
  }, [fetchedOrders, hasInitialized, chartRef])

  // Handle real-time order updates from SSE stream
  const handleOrderUpdate = useCallback(
    (event: OrderUpdateEvent) => {
      const { order } = event
      console.log('[OrderManagement] Order update:', order.status, order.id, order.symbol)

      setPlacedOrders((prev) => {
        // Find and update the existing order
        const existingIndex = prev.findIndex((o) => o.id === order.id)
        if (existingIndex === -1) {
          // New order we don't have locally - add it
          return [
            {
              id: order.id,
              symbol: order.symbol,
              side: order.side,
              type: order.type,
              price: order.price ?? 0,
              quantity: order.quantity,
              status: order.status,
              createdAt: new Date(order.createdAt),
            },
            ...prev,
          ]
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
        refetchBalances()
      }
    },
    [chartRef, refetchBalances]
  )

  // Subscribe to real-time order updates (only when authenticated)
  useOrderUpdates(handleOrderUpdate, createOrderMutation.isAuthenticated)

  // Create a new order
  const createOrder = useCallback(
    (
      params: CreateOrderParams,
      callbacks?: {
        onSuccess?: (order: PlacedOrder) => void
        onError?: (error: Error) => void
      }
    ) => {
      createOrderMutation.mutate(params, {
        onSuccess: (order) => {
          console.log('[OrderManagement] Order created:', order)

          const newOrder: PlacedOrder = {
            id: order.id,
            symbol: order.symbol,
            side: order.side,
            type: order.type,
            price: order.price ?? 0,
            quantity: order.quantity,
            status: order.status,
            createdAt: new Date(order.createdAt),
          }

          setPlacedOrders((prev) => [newOrder, ...prev])

          // Add price line to chart
          chartRef.current?.addOrderLine({
            id: order.id,
            side: order.side,
            price: order.price ?? 0,
            quantity: order.quantity,
          })

          callbacks?.onSuccess?.(newOrder)
        },
        onError: (error) => {
          console.error('[OrderManagement] Failed to create order:', error)
          callbacks?.onError?.(error)
        },
      })
    },
    [createOrderMutation, chartRef]
  )

  // Cancel an order (removes from UI for now - API not yet implemented)
  const cancelOrder = useCallback(
    (orderId: string) => {
      setPlacedOrders((prev) => prev.filter((o) => o.id !== orderId))
      chartRef.current?.removeOrderLine(orderId)
    },
    [chartRef]
  )

  return {
    placedOrders,
    createOrder,
    cancelOrder,
    isCreating: createOrderMutation.isPending,
    isAuthenticated: createOrderMutation.isAuthenticated,
  }
}
