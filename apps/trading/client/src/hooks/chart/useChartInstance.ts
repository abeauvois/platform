import { CandlestickSeries, LineSeries, createChart } from 'lightweight-charts'
import { useEffect, useRef } from 'react'

import {
    getCandlestickSeriesOptions,
    getChartOptions,
    getEmaSeriesOptions,
} from '../../components/TradingChart/chart-config'

import type { IChartApi, IPriceLine, ISeriesApi } from 'lightweight-charts'

export interface UseChartInstanceParams {
    symbol: string
    interval: string
    limit: number
}

export interface UseChartInstanceReturn {
    chartContainerRef: React.RefObject<HTMLDivElement | null>
    chartRef: React.MutableRefObject<IChartApi | null>
    candlestickSeriesRef: React.MutableRefObject<ISeriesApi<'Candlestick'> | null>
    ema20SeriesRef: React.MutableRefObject<ISeriesApi<'Line'> | null>
    orderHistorySeriesRef: React.MutableRefObject<Map<string, ISeriesApi<'Line'>>>
    trendLineSeriesRef: React.MutableRefObject<Map<string, ISeriesApi<'Line'>>>
    priceLinesRef: React.MutableRefObject<Map<string, IPriceLine>>
    previewLineRef: React.MutableRefObject<IPriceLine | null>
    chartInitializedRef: React.MutableRefObject<boolean>
}

/**
 * Hook to manage chart instance lifecycle
 *
 * Handles:
 * - Chart creation with theme options
 * - Candlestick and EMA series initialization
 * - Window resize handling
 * - Cleanup on unmount or dependency change
 */
export function useChartInstance({
    symbol,
    interval,
    limit,
}: UseChartInstanceParams): UseChartInstanceReturn {
    const chartContainerRef = useRef<HTMLDivElement | null>(null)
    const chartRef = useRef<IChartApi | null>(null)
    const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
    const ema20SeriesRef = useRef<ISeriesApi<'Line'> | null>(null)
    const orderHistorySeriesRef = useRef<Map<string, ISeriesApi<'Line'>>>(new Map())
    const trendLineSeriesRef = useRef<Map<string, ISeriesApi<'Line'>>>(new Map())
    const priceLinesRef = useRef<Map<string, IPriceLine>>(new Map())
    const previewLineRef = useRef<IPriceLine | null>(null)
    const chartInitializedRef = useRef(false)

    useEffect(() => {
        if (!chartContainerRef.current) return

        const container = chartContainerRef.current

        // Create chart instance with theme options
        const chart = createChart(container, getChartOptions(container.clientWidth))

        // Add candlestick series
        const candlestickSeries = chart.addSeries(
            CandlestickSeries,
            getCandlestickSeriesOptions()
        )

        // Add EMA series
        const ema20Series = chart.addSeries(LineSeries, getEmaSeriesOptions())

        // Store refs
        chartRef.current = chart
        candlestickSeriesRef.current = candlestickSeries
        ema20SeriesRef.current = ema20Series

        // Handle window resize
        const handleResize = () => {
            if (chartContainerRef.current && chartRef.current) {
                chartRef.current.applyOptions({
                    width: chartContainerRef.current.clientWidth,
                })
            }
        }

        window.addEventListener('resize', handleResize)

        // Cleanup
        return () => {
            window.removeEventListener('resize', handleResize)
            priceLinesRef.current.clear()
            orderHistorySeriesRef.current.clear()
            trendLineSeriesRef.current.clear()
            chart.remove()
            chartInitializedRef.current = false
        }
    }, [symbol, interval, limit])

    return {
        chartContainerRef,
        chartRef,
        candlestickSeriesRef,
        ema20SeriesRef,
        orderHistorySeriesRef,
        trendLineSeriesRef,
        priceLinesRef,
        previewLineRef,
        chartInitializedRef,
    }
}
