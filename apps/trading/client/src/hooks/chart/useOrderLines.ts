import { useCallback, useEffect } from 'react'

import { getOrderLineOptions } from '../../components/TradingChart/chart-config'

import type { OrderLine } from '../../components/TradingChart/types'
import type { IPriceLine, ISeriesApi } from 'lightweight-charts'

export interface UseOrderLinesParams {
    orders: Array<OrderLine>
    symbol: string
    candlestickSeriesRef: React.MutableRefObject<ISeriesApi<'Candlestick'> | null>
    priceLinesRef: React.MutableRefObject<Map<string, IPriceLine>>
}

export interface UseOrderLinesReturn {
    addOrderLine: (order: OrderLine) => void
    removeOrderLine: (orderId: string) => void
}

/**
 * Format order value as title string
 */
function formatOrderTitle(side: 'buy' | 'sell', price: number, quantity: number): string {
    const orderValue = price * quantity
    return `${side.toUpperCase()} $${orderValue.toFixed(2)}`
}

/**
 * Hook to manage order price lines on the chart
 *
 * Handles:
 * - Syncing order lines when orders prop changes
 * - Adding/removing individual order lines via callbacks
 * - Consistent styling via getOrderLineOptions
 */
export function useOrderLines({
    orders,
    symbol,
    candlestickSeriesRef,
    priceLinesRef,
}: UseOrderLinesParams): UseOrderLinesReturn {
    // Add a single order line
    const addOrderLine = useCallback(
        (order: OrderLine) => {
            if (!candlestickSeriesRef.current) return

            // Remove existing line with same id if present
            const existingLine = priceLinesRef.current.get(order.id)
            if (existingLine) {
                candlestickSeriesRef.current.removePriceLine(existingLine)
            }

            const title = formatOrderTitle(order.side, order.price, order.quantity)
            const priceLine = candlestickSeriesRef.current.createPriceLine({
                price: order.price,
                ...getOrderLineOptions(order.side, title),
            })

            priceLinesRef.current.set(order.id, priceLine)
        },
        [candlestickSeriesRef, priceLinesRef]
    )

    // Remove a single order line
    const removeOrderLine = useCallback(
        (orderId: string) => {
            const priceLine = priceLinesRef.current.get(orderId)
            if (priceLine && candlestickSeriesRef.current) {
                candlestickSeriesRef.current.removePriceLine(priceLine)
                priceLinesRef.current.delete(orderId)
            }
        },
        [candlestickSeriesRef, priceLinesRef]
    )

    // Sync order lines when orders change or chart re-initializes
    useEffect(() => {
        if (!candlestickSeriesRef.current) return

        // Clear existing order lines
        for (const [id, priceLine] of priceLinesRef.current) {
            candlestickSeriesRef.current.removePriceLine(priceLine)
            priceLinesRef.current.delete(id)
        }

        // Redraw all pending/partially_filled orders
        for (const order of orders) {
            const title = formatOrderTitle(order.side, order.price, order.quantity)
            const priceLine = candlestickSeriesRef.current.createPriceLine({
                price: order.price,
                ...getOrderLineOptions(order.side, title),
            })
            priceLinesRef.current.set(order.id, priceLine)
        }
    }, [orders, symbol, candlestickSeriesRef, priceLinesRef])

    return {
        addOrderLine,
        removeOrderLine,
    }
}
