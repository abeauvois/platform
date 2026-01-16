import { useEffect } from 'react'

import { getSideColor } from '../../components/TradingChart/chart-config'

import type { OrderHistoryItem } from '../../components/TradingChart/types'
import type { KlinesResponse } from '../../lib/api'
import type { ISeriesApi, SeriesMarker, Time } from 'lightweight-charts'

export interface UseOrderHistorySeriesParams {
    orderHistory: Array<OrderHistoryItem>
    klinesData: KlinesResponse | undefined
    candlestickSeriesRef: React.MutableRefObject<ISeriesApi<'Candlestick'> | null>
}

/**
 * Hook to manage order history visualization as markers on the candlestick series
 *
 * Handles:
 * - Filtering orders within visible time range
 * - Rendering buy/sell markers at order execution points
 * - Markers don't cover candlesticks (unlike line series)
 */
export function useOrderHistorySeries({
    orderHistory,
    klinesData,
    candlestickSeriesRef,
}: UseOrderHistorySeriesParams): void {
    useEffect(() => {
        if (!candlestickSeriesRef.current || !klinesData?.klines.length) {
            return
        }

        const series = candlestickSeriesRef.current

        // Get the visible time range from klines data
        const firstKline = klinesData.klines[0]
        const lastKline = klinesData.klines.at(-1)
        if (!lastKline) return

        const chartStartTime = Math.floor(firstKline.openTime / 1000)
        const chartEndTime = Math.floor(lastKline.closeTime / 1000)

        // Filter orders to only those within the visible time range
        const visibleOrders = orderHistory.filter((order) => {
            return order.time >= chartStartTime && order.time <= chartEndTime
        })

        // Create markers for each visible order
        const markers: Array<SeriesMarker<Time>> = visibleOrders
            .filter((order) => order.price)
            .map((order) => ({
                time: order.time as Time,
                position: order.side === 'buy' ? ('belowBar' as const) : ('aboveBar' as const),
                color: getSideColor(order.side),
                shape: order.side === 'buy' ? ('arrowUp' as const) : ('arrowDown' as const),
                size: 1,
            }))
            .sort((a, b) => (a.time as number) - (b.time as number))

        // Set markers on the candlestick series
        series.setMarkers(markers)
    }, [orderHistory, klinesData, candlestickSeriesRef])
}
