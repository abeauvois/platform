import {
    detectTrendLines,
    getPriceAtTime,
    type TrendLineConfig,
} from '@platform/trading-domain'
import { useEffect, useMemo } from 'react'

import {
    getTrendLineSeriesOptions,
    TRENDLINE_CONFIG,
} from '../../components/TradingChart/trendline-config'

import type { KlinesResponse } from '../../lib/api'
import { LineSeries } from 'lightweight-charts'

import type { IChartApi, ISeriesApi, Time } from 'lightweight-charts'

export interface UseTrendLinesParams {
    klinesData: KlinesResponse | undefined
    ema20Data: Array<{ time: Time; value: number }>
    chartRef: React.MutableRefObject<IChartApi | null>
    trendLineSeriesRef: React.MutableRefObject<Map<string, ISeriesApi<'Line'>>>
}

/**
 * Hook to manage trend line detection and rendering
 *
 * Handles:
 * - Detecting swing points from klines data
 * - Generating trend lines from swing points
 * - Checking for EMA breaks
 * - Rendering lines on chart using LineSeries
 * - Extending lines to the right edge of the chart
 */
export function useTrendLines({
    klinesData,
    ema20Data,
    chartRef,
    trendLineSeriesRef,
}: UseTrendLinesParams): void {
    // Configuration for trend line detection
    const config: TrendLineConfig = useMemo(
        () => ({
            swingConfig: { lookbackBars: TRENDLINE_CONFIG.lookbackBars },
            maxLines: TRENDLINE_CONFIG.maxLines,
            extendRight: TRENDLINE_CONFIG.extendRight,
        }),
        []
    )

    // Detect trend lines when data changes
    const trendLineResult = useMemo(() => {
        if (!klinesData?.klines.length) {
            return { supportLines: [], resistanceLines: [], swingPoints: [] }
        }

        // Convert EMA data to domain format (Time -> number)
        const emaDataForDetection = ema20Data.map((p) => ({
            time: p.time as number,
            value: p.value,
        }))

        return detectTrendLines(klinesData.klines, emaDataForDetection, config)
    }, [klinesData, ema20Data, config])

    // Render trend lines on chart
    useEffect(() => {
        if (!chartRef.current || !klinesData?.klines.length) return

        const chart = chartRef.current
        const allLines = [
            ...trendLineResult.supportLines,
            ...trendLineResult.resistanceLines,
        ]

        // Get current trend line IDs
        const currentLineIds = new Set(allLines.map((l) => l.id))

        // Remove series for trend lines no longer present
        for (const [lineId, series] of trendLineSeriesRef.current) {
            if (!currentLineIds.has(lineId)) {
                chart.removeSeries(series)
                trendLineSeriesRef.current.delete(lineId)
            }
        }

        // Calculate extension time (extend a fixed number of candles beyond end point)
        const lastKline = klinesData.klines.at(-1)
        if (!lastKline) return

        // Calculate average candle duration in seconds
        const avgCandleDuration =
            (lastKline.closeTime - klinesData.klines[0].openTime) /
            1000 /
            klinesData.klines.length

        // Extension amount in seconds (fixed number of candles)
        const extensionSeconds = avgCandleDuration * TRENDLINE_CONFIG.extendCandles

        // Add or update series for each trend line
        for (const line of allLines) {
            let series = trendLineSeriesRef.current.get(line.id)

            // Create new series if it doesn't exist
            if (!series) {
                series = chart.addSeries(
                    LineSeries,
                    getTrendLineSeriesOptions(line.type, line.isBroken)
                )
                trendLineSeriesRef.current.set(line.id, series)
            } else {
                // Update options if broken status changed
                series.applyOptions(getTrendLineSeriesOptions(line.type, line.isBroken))
            }

            // Calculate end time and price
            // Extend from the line's end point by a fixed number of candles
            const endTime = config.extendRight
                ? line.endPoint.time + extensionSeconds
                : line.endPoint.time
            const endPrice = config.extendRight
                ? getPriceAtTime(line, endTime)
                : line.endPoint.price

            // Set data for this trend line (start point to extended end)
            series.setData([
                { time: line.startPoint.time as Time, value: line.startPoint.price },
                { time: endTime as Time, value: endPrice },
            ])
        }
    }, [trendLineResult, klinesData, chartRef, trendLineSeriesRef, config])
}
