import { useCallback, useEffect, useRef } from 'react'

import { CHART_COLORS, getSideColor } from '../../components/TradingChart/chart-config'

import type { OrderHistoryItem } from '../../components/TradingChart/types'
import type { KlinesResponse } from '../../lib/api'
import type { IChartApi, ISeriesApi, SeriesMarker, Time } from 'lightweight-charts'

export interface UseReferenceMarkerParams {
    referenceTimestamp: number | null
    orderHistory: Array<OrderHistoryItem>
    klinesData: KlinesResponse | undefined
    candlestickSeriesRef: React.MutableRefObject<ISeriesApi<'Candlestick'> | null>
    chartRef: React.MutableRefObject<IChartApi | null>
    chartContainerRef: React.RefObject<HTMLDivElement | null>
}

export interface UseReferenceMarkerReturn {
    setReferenceMarker: (time: number | null) => void
}

/** Default number of candles back for reference point when none is set */
const DEFAULT_REFERENCE_OFFSET = 10

/**
 * Hook to manage reference marker on the chart
 *
 * Handles:
 * - Displaying vertical line at reference point on the time axis
 * - Default reference point 10 candles back when none is set
 * - Order history markers on the candlestick series
 * - Updating when reference changes
 */
export function useReferenceMarker({
    referenceTimestamp,
    orderHistory,
    klinesData,
    candlestickSeriesRef,
    chartRef,
    chartContainerRef,
}: UseReferenceMarkerParams): UseReferenceMarkerReturn {
    // Track the current reference timestamp internally
    const currentRefTimestamp = useRef<number | null>(referenceTimestamp)
    // Track the vertical reference line element
    const referenceLineElement = useRef<HTMLDivElement | null>(null)

    // Function to update the vertical reference line position
    const updateReferenceLine = useCallback(() => {
        if (!chartRef.current || !chartContainerRef.current || !klinesData?.klines.length) {
            return
        }

        const klines = klinesData.klines

        // Determine reference time: use explicit timestamp or default to 10 candles back
        let refTimeSeconds: number
        let isDefaultRef = false

        if (currentRefTimestamp.current !== null) {
            refTimeSeconds = Math.floor(currentRefTimestamp.current / 1000)
        } else {
            // Default: 10 candles back from the last candle
            const defaultIndex = Math.max(0, klines.length - 1 - DEFAULT_REFERENCE_OFFSET)
            const defaultKline = klines[defaultIndex]
            refTimeSeconds = Math.floor(defaultKline.openTime / 1000)
            isDefaultRef = true
        }

        // Get X coordinate for the reference time
        const timeScale = chartRef.current.timeScale()
        const x = timeScale.timeToCoordinate(refTimeSeconds as Time)

        if (x === null) {
            // Reference time is outside visible range, hide line
            if (referenceLineElement.current) {
                referenceLineElement.current.style.display = 'none'
            }
            return
        }

        // Create or update the reference line element
        if (!referenceLineElement.current) {
            const line = document.createElement('div')
            line.style.position = 'absolute'
            line.style.top = '0'
            line.style.bottom = '0'
            line.style.width = '2px'
            line.style.backgroundColor = CHART_COLORS.reference
            line.style.pointerEvents = 'none'
            line.style.zIndex = '5'
            chartContainerRef.current.appendChild(line)
            referenceLineElement.current = line
        }

        // Update line style based on whether it's default or explicit
        referenceLineElement.current.style.opacity = isDefaultRef ? '0.4' : '0.8'
        referenceLineElement.current.style.left = `${x}px`
        referenceLineElement.current.style.display = 'block'
    }, [chartRef, chartContainerRef, klinesData])

    // Function to update order history markers on the series
    const updateOrderMarkers = useCallback(() => {
        if (!candlestickSeriesRef.current || !klinesData?.klines.length) {
            return
        }

        const series = candlestickSeriesRef.current
        const klines = klinesData.klines

        // Get the visible time range from klines data
        const firstKline = klines[0]
        const lastKline = klines.at(-1)
        if (!lastKline) return

        const chartStartTime = Math.floor(firstKline.openTime / 1000)
        const chartEndTime = Math.floor(lastKline.closeTime / 1000)

        // Build order history markers only (reference is now a vertical line)
        const visibleOrders = orderHistory.filter((order) => {
            return order.time >= chartStartTime && order.time <= chartEndTime
        })

        const orderMarkers: Array<SeriesMarker<Time>> = visibleOrders
            .filter((order) => order.price)
            .map((order) => ({
                time: order.time as Time,
                position: order.side === 'buy' ? ('belowBar' as const) : ('aboveBar' as const),
                color: getSideColor(order.side),
                shape: order.side === 'buy' ? ('arrowUp' as const) : ('arrowDown' as const),
                size: 1,
            }))

        // Sort markers by time
        orderMarkers.sort((a, b) => (a.time as number) - (b.time as number))

        // Set order markers on the series
        series.setMarkers(orderMarkers)
    }, [orderHistory, klinesData, candlestickSeriesRef])

    // Update reference line and order markers when data changes
    useEffect(() => {
        currentRefTimestamp.current = referenceTimestamp
        updateReferenceLine()
        updateOrderMarkers()
    }, [referenceTimestamp, klinesData, updateReferenceLine, updateOrderMarkers])

    // Update reference line position when chart is scrolled/zoomed
    useEffect(() => {
        if (!chartRef.current) return

        const timeScale = chartRef.current.timeScale()
        const handleVisibleRangeChange = () => {
            updateReferenceLine()
        }

        timeScale.subscribeVisibleTimeRangeChange(handleVisibleRangeChange)
        return () => {
            timeScale.unsubscribeVisibleTimeRangeChange(handleVisibleRangeChange)
        }
    }, [chartRef, updateReferenceLine])

    // Cleanup reference line element on unmount
    useEffect(() => {
        return () => {
            if (referenceLineElement.current) {
                referenceLineElement.current.remove()
                referenceLineElement.current = null
            }
        }
    }, [])

    // Imperative function to set reference marker
    const setReferenceMarker = useCallback(
        (time: number | null) => {
            currentRefTimestamp.current = time
            updateReferenceLine()
        },
        [updateReferenceLine]
    )

    return {
        setReferenceMarker,
    }
}
