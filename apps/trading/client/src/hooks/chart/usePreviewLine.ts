import { formatPrice } from '@platform/trading-domain'
import { useCallback } from 'react'

import { getPreviewLineOptions } from '../../components/TradingChart/chart-config'

import type { IPriceLine, ISeriesApi } from 'lightweight-charts'

export interface UsePreviewLineParams {
    currentPrice: number
    candlestickSeriesRef: React.MutableRefObject<ISeriesApi<'Candlestick'> | null>
    previewLineRef: React.MutableRefObject<IPriceLine | null>
}

export interface UsePreviewLineReturn {
    showPreviewLine: (price: number, side: 'buy' | 'sell') => void
    hidePreviewLine: () => void
}

/**
 * Format preview line title with percentage from current price
 */
function formatPreviewTitle(
    side: 'buy' | 'sell',
    price: number,
    currentPrice: number
): string {
    let percentLabel = ''
    if (currentPrice > 0) {
        const percentDiff = ((price - currentPrice) / currentPrice) * 100
        const sign = percentDiff >= 0 ? '+' : ''
        percentLabel = ` (${sign}${percentDiff.toFixed(2)}%)`
    }

    return `${side.toUpperCase()} @ ${formatPrice(price)}${percentLabel}`
}

/**
 * Hook to manage the drag preview line
 *
 * Handles:
 * - Showing preview line at drag position
 * - Displaying percentage from current price
 * - Hiding preview on drag end
 */
export function usePreviewLine({
    currentPrice,
    candlestickSeriesRef,
    previewLineRef,
}: UsePreviewLineParams): UsePreviewLineReturn {
    const showPreviewLine = useCallback(
        (price: number, side: 'buy' | 'sell') => {
            if (!candlestickSeriesRef.current) return

            // Remove existing preview line
            if (previewLineRef.current) {
                candlestickSeriesRef.current.removePriceLine(previewLineRef.current)
            }

            const title = formatPreviewTitle(side, price, currentPrice)

            // Create new preview line
            previewLineRef.current = candlestickSeriesRef.current.createPriceLine({
                price,
                ...getPreviewLineOptions(side, title),
            })
        },
        [currentPrice, candlestickSeriesRef, previewLineRef]
    )

    const hidePreviewLine = useCallback(() => {
        if (previewLineRef.current && candlestickSeriesRef.current) {
            candlestickSeriesRef.current.removePriceLine(previewLineRef.current)
            previewLineRef.current = null
        }
    }, [candlestickSeriesRef, previewLineRef])

    return {
        showPreviewLine,
        hidePreviewLine,
    }
}
