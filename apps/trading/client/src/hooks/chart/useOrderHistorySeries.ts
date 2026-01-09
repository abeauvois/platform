import { LineSeries } from 'lightweight-charts'
import { useEffect } from 'react'

import { getOrderHistorySeriesOptions } from '../../components/TradingChart/chart-config'
import { parseIntervalToSeconds } from '../../utils/interval'

import type { OrderHistoryItem } from '../../components/TradingChart/types'
import type { KlinesResponse } from '../../lib/api'
import type { IChartApi, ISeriesApi, Time } from 'lightweight-charts'

export interface UseOrderHistorySeriesParams {
    orderHistory: Array<OrderHistoryItem>
    interval: string
    klinesData: KlinesResponse | undefined
    chartRef: React.MutableRefObject<IChartApi | null>
    orderHistorySeriesRef: React.MutableRefObject<Map<string, ISeriesApi<'Line'>>>
}

/**
 * Hook to manage order history visualization as line series
 *
 * Handles:
 * - Filtering orders within visible time range
 * - Creating/updating/removing line series for orders
 * - Positioning lines at order execution time
 */
export function useOrderHistorySeries({
    orderHistory,
    interval,
    klinesData,
    chartRef,
    orderHistorySeriesRef,
}: UseOrderHistorySeriesParams): void {
    useEffect(() => {
        if (!chartRef.current || !klinesData?.klines.length) return

        const chart = chartRef.current

        // Calculate half the line width in seconds (1.5 candles on each side = 3 candles total)
        const intervalSeconds = parseIntervalToSeconds(interval)
        const halfLineWidth = intervalSeconds * 1.5

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

        // Get current order IDs in the visible history
        const currentOrderIds = new Set(visibleOrders.map((o) => o.id))

        // Remove series for orders no longer visible
        for (const [orderId, series] of orderHistorySeriesRef.current) {
            if (!currentOrderIds.has(orderId)) {
                chart.removeSeries(series)
                orderHistorySeriesRef.current.delete(orderId)
            }
        }

        // Add or update series for each visible order
        for (const order of visibleOrders) {
            if (!order.price) continue

            let series = orderHistorySeriesRef.current.get(order.id)

            // Create new series if it doesn't exist
            if (!series) {
                series = chart.addSeries(LineSeries, getOrderHistorySeriesOptions(order.side))
                orderHistorySeriesRef.current.set(order.id, series)
            }

            // Set data for this order's series (2 points at same price, different times)
            series.setData([
                { time: (order.time - halfLineWidth) as Time, value: order.price },
                { time: (order.time + halfLineWidth) as Time, value: order.price },
            ])
        }
    }, [orderHistory, interval, klinesData, chartRef, orderHistorySeriesRef])
}
