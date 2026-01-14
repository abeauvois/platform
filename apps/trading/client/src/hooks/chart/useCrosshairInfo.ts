import { useEffect, useState } from 'react'

import type { IChartApi, ISeriesApi } from 'lightweight-charts'

export interface CrosshairInfo {
    /** Price at cursor Y position */
    cursorPrice: number | null
    /** Last candle close price */
    lastPrice: number | null
    /** Absolute price difference (cursor - last) */
    priceDiff: number | null
    /** Percentage difference */
    percentDiff: number | null
    /** Whether cursor is currently over the chart */
    isActive: boolean
}

const DEFAULT_INFO: CrosshairInfo = {
    cursorPrice: null,
    lastPrice: null,
    priceDiff: null,
    percentDiff: null,
    isActive: false,
}

export interface UseCrosshairInfoParams {
    chartRef: React.MutableRefObject<IChartApi | null>
    candlestickSeriesRef: React.MutableRefObject<ISeriesApi<'Candlestick'> | null>
    lastPrice: number
}

/**
 * Hook to track crosshair position and calculate variation from last price
 *
 * Subscribes to chart crosshair move events and calculates:
 * - Current price at cursor Y position
 * - Difference from the last candle close price
 * - Percentage variation
 */
export function useCrosshairInfo({
    chartRef,
    candlestickSeriesRef,
    lastPrice,
}: UseCrosshairInfoParams): CrosshairInfo {
    const [info, setInfo] = useState<CrosshairInfo>(DEFAULT_INFO)

    useEffect(() => {
        const chart = chartRef.current
        const series = candlestickSeriesRef.current
        if (!chart || !series) return

        const handler = (param: { point?: { x: number; y: number } }) => {
            // No point means cursor left the chart area
            if (!param.point) {
                setInfo(DEFAULT_INFO)
                return
            }

            // Convert Y coordinate to price
            const cursorPrice = series.coordinateToPrice(param.point.y)
            if (cursorPrice === null || lastPrice <= 0) {
                setInfo({ ...DEFAULT_INFO, isActive: true })
                return
            }

            // Calculate variation
            const priceDiff = cursorPrice - lastPrice
            const percentDiff = (priceDiff / lastPrice) * 100

            setInfo({
                cursorPrice,
                lastPrice,
                priceDiff,
                percentDiff,
                isActive: true,
            })
        }

        chart.subscribeCrosshairMove(handler)
        return () => {
            chart.unsubscribeCrosshairMove(handler)
        }
    }, [chartRef, candlestickSeriesRef, lastPrice])

    return info
}
