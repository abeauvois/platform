import { calculateEMA, calculatePricePrecision, getMinMove } from '@platform/trading-domain'
import { useEffect, useMemo } from 'react'

import { useKlines } from '../queries'

import type { Candlestick } from '@platform/trading-domain'
import type { IChartApi, ISeriesApi, Time } from 'lightweight-charts'

export interface UseChartDataParams {
    symbol: string
    interval: string
    limit: number
    candlestickSeriesRef: React.MutableRefObject<ISeriesApi<'Candlestick'> | null>
    ema20SeriesRef: React.MutableRefObject<ISeriesApi<'Line'> | null>
    chartRef: React.MutableRefObject<IChartApi | null>
    chartInitializedRef: React.MutableRefObject<boolean>
}

export interface UseChartDataReturn {
    klinesData: ReturnType<typeof useKlines>['data']
    refetchKlines: () => void
}

/**
 * Hook to manage chart data transformation and updates
 *
 * Handles:
 * - Fetching klines data via useKlines
 * - Transforming klines to chart format
 * - Calculating and displaying EMA
 * - Applying price precision based on data
 * - Initial content fit (preserves zoom/pan on refreshes)
 */
export function useChartData({
    symbol,
    interval,
    limit,
    candlestickSeriesRef,
    ema20SeriesRef,
    chartRef,
    chartInitializedRef,
}: UseChartDataParams): UseChartDataReturn {
    // Fetch klines data
    const { data: klinesData, refetch: refetchKlines } = useKlines({
        symbol,
        interval,
        limit,
    })

    // Calculate EMA data when klines change
    const ema20Data = useMemo(() => {
        if (!klinesData?.klines) return []
        return calculateEMA(klinesData.klines, 20).map((p) => ({
            ...p,
            time: p.time as Time,
        }))
    }, [klinesData])

    // Update chart when klines data changes
    useEffect(() => {
        if (!klinesData || !candlestickSeriesRef.current) return

        // Transform data for Lightweight Charts
        const chartData = klinesData.klines.map((k: Candlestick) => ({
            time: Math.floor(k.openTime / 1000) as Time,
            open: k.open,
            high: k.high,
            low: k.low,
            close: k.close,
        }))

        // Calculate price precision based on data
        const lastCandle = klinesData.klines.at(-1)
        if (!lastCandle) return

        const pricePrecision = calculatePricePrecision(lastCandle.close)
        const minMove = getMinMove(pricePrecision)

        // Update series price format for low-value tokens
        candlestickSeriesRef.current.applyOptions({
            priceFormat: {
                type: 'price',
                precision: pricePrecision,
                minMove,
            },
        })

        // Update EMA series price format too
        if (ema20SeriesRef.current) {
            ema20SeriesRef.current.applyOptions({
                priceFormat: {
                    type: 'price',
                    precision: pricePrecision,
                    minMove,
                },
            })
        }

        // Set candlestick data
        candlestickSeriesRef.current.setData(chartData)

        // Set EMA data
        if (ema20SeriesRef.current && ema20Data.length > 0) {
            ema20SeriesRef.current.setData(ema20Data)
        }

        // Only fit content on initial load, preserve zoom/pan on data refreshes
        if (!chartInitializedRef.current) {
            chartRef.current?.timeScale().fitContent()
            chartInitializedRef.current = true
        }
    }, [klinesData, ema20Data, candlestickSeriesRef, ema20SeriesRef, chartRef, chartInitializedRef])

    return {
        klinesData,
        refetchKlines,
    }
}
