import { useCallback, useEffect, useRef } from 'react'

import { CHART_COLORS, getSideColor } from '../../components/TradingChart/chart-config'

import type { OrderHistoryItem } from '../../components/TradingChart/types'
import type { KlinesResponse } from '../../lib/api'
import type { ISeriesApi, SeriesMarker, Time } from 'lightweight-charts'

export interface UseReferenceMarkerParams {
    referenceTimestamp: number | null
    orderHistory: Array<OrderHistoryItem>
    klinesData: KlinesResponse | undefined
    candlestickSeriesRef: React.MutableRefObject<ISeriesApi<'Candlestick'> | null>
}

export interface UseReferenceMarkerReturn {
    setReferenceMarker: (time: number | null) => void
}

/** Default number of candles back for reference point when none is set */
const DEFAULT_REFERENCE_OFFSET = 10

/**
 * Hook to manage reference marker on the candlestick series
 *
 * Handles:
 * - Displaying blue circle marker at reference point
 * - Default reference point 10 candles back when none is set
 * - Merging with order history markers
 * - Updating when reference changes
 */
export function useReferenceMarker({
    referenceTimestamp,
    orderHistory,
    klinesData,
    candlestickSeriesRef,
}: UseReferenceMarkerParams): UseReferenceMarkerReturn {
    // Track the current reference timestamp internally
    const currentRefTimestamp = useRef<number | null>(referenceTimestamp)

    // Function to update markers (combines order history + reference)
    const updateMarkers = useCallback(() => {
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

        // Build order history markers
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

        // Build reference marker
        const markers: Array<SeriesMarker<Time>> = [...orderMarkers]

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

        // Only show if within visible range
        if (refTimeSeconds >= chartStartTime && refTimeSeconds <= chartEndTime) {
            markers.push({
                time: refTimeSeconds as Time,
                position: 'aboveBar' as const,
                color: CHART_COLORS.reference,
                shape: 'circle' as const,
                text: isDefaultRef ? '' : 'REF',
                size: isDefaultRef ? 1 : 2,
            })
        }

        // Sort markers by time
        markers.sort((a, b) => (a.time as number) - (b.time as number))

        // Set all markers on the series
        series.setMarkers(markers)
    }, [orderHistory, klinesData, candlestickSeriesRef])

    // Update markers when reference timestamp or klines data changes
    // klinesData is included to ensure markers are re-applied when symbol changes
    useEffect(() => {
        currentRefTimestamp.current = referenceTimestamp
        updateMarkers()
    }, [referenceTimestamp, klinesData, updateMarkers])

    // Imperative function to set reference marker
    const setReferenceMarker = useCallback(
        (time: number | null) => {
            currentRefTimestamp.current = time
            updateMarkers()
        },
        [updateMarkers]
    )

    return {
        setReferenceMarker,
    }
}
