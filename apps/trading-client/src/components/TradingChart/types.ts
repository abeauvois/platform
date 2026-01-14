import type { IChartApi, IPriceLine, ISeriesApi } from 'lightweight-charts'
import type { RefObject, MutableRefObject } from 'react'

/**
 * Order line to display on chart
 */
export interface OrderLine {
    id: string
    side: 'buy' | 'sell'
    price: number
    quantity: number
}

/**
 * Order history item to display on chart
 */
export interface OrderHistoryItem {
    id: string
    side: 'buy' | 'sell'
    price: number
    time: number // Unix timestamp in seconds
}

/**
 * Imperative handle exposed by TradingChart via ref
 */
export interface TradingChartHandle {
    getPriceAtY: (y: number) => number | null
    getChartRect: () => DOMRect | null
    addOrderLine: (order: OrderLine) => void
    removeOrderLine: (orderId: string) => void
    showPreviewLine: (price: number, side: 'buy' | 'sell') => void
    hidePreviewLine: () => void
}

/**
 * Props for TradingChart component
 */
export interface TradingChartProps {
    symbol?: string
    interval?: string
    limit?: number
    orders?: Array<OrderLine>
    orderHistory?: Array<OrderHistoryItem>
    currentPrice?: number
    isInWatchlist?: boolean
    onAddToWatchlist?: () => void
    onAssetSelect?: (baseAsset: string) => void
    onIntervalChange?: (interval: string) => void
}

/**
 * Internal refs used by chart hooks
 */
export interface ChartRefs {
    chartContainer: RefObject<HTMLDivElement | null>
    chart: MutableRefObject<IChartApi | null>
    candlestickSeries: MutableRefObject<ISeriesApi<'Candlestick'> | null>
    ema20Series: MutableRefObject<ISeriesApi<'Line'> | null>
    orderHistorySeries: MutableRefObject<Map<string, ISeriesApi<'Line'>>>
    priceLines: MutableRefObject<Map<string, IPriceLine>>
    previewLine: MutableRefObject<IPriceLine | null>
    chartInitialized: MutableRefObject<boolean>
}
