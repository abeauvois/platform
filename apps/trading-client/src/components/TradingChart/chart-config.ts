import { ColorType } from 'lightweight-charts'

/**
 * Chart theme colors
 */
export const CHART_COLORS = {
    background: '#1a1a1a',
    text: '#d1d5db',
    grid: '#2a2a2a',
    border: '#2a2a2a',
    up: '#22c55e',
    down: '#ef4444',
    ema: '#f59e0b',
} as const

/**
 * Chart dimensions
 */
export const CHART_DIMENSIONS = {
    height: 500,
} as const

/**
 * Line style constants (lightweight-charts)
 */
export const LINE_STYLES = {
    solid: 0,
    dashed: 2,
} as const

/**
 * Get color based on order side
 */
export function getSideColor(side: 'buy' | 'sell'): string {
    return side === 'buy' ? CHART_COLORS.up : CHART_COLORS.down
}

/**
 * Get chart options with theme
 */
export function getChartOptions(width: number) {
    return {
        layout: {
            background: { type: ColorType.Solid, color: CHART_COLORS.background },
            textColor: CHART_COLORS.text,
        },
        width,
        height: CHART_DIMENSIONS.height,
        grid: {
            vertLines: { color: CHART_COLORS.grid },
            horzLines: { color: CHART_COLORS.grid },
        },
        crosshair: {
            mode: 0, // Normal mode - free cursor (not snapping to data points)
        },
        rightPriceScale: {
            borderColor: CHART_COLORS.border,
        },
        timeScale: {
            borderColor: CHART_COLORS.border,
            timeVisible: true,
            secondsVisible: false,
        },
    }
}

/**
 * Get candlestick series options
 */
export function getCandlestickSeriesOptions() {
    return {
        upColor: CHART_COLORS.up,
        downColor: CHART_COLORS.down,
        borderVisible: false,
        wickUpColor: CHART_COLORS.up,
        wickDownColor: CHART_COLORS.down,
    }
}

/**
 * Get EMA series options
 */
export function getEmaSeriesOptions() {
    return {
        color: CHART_COLORS.ema,
        lineWidth: 2 as const,
        priceLineVisible: false,
        lastValueVisible: false,
    }
}

/**
 * Get order line options for price lines
 */
export function getOrderLineOptions(side: 'buy' | 'sell', title: string) {
    return {
        color: getSideColor(side),
        lineWidth: 2 as const,
        lineStyle: LINE_STYLES.dashed,
        axisLabelVisible: false,
        title,
    }
}

/**
 * Get preview line options
 */
export function getPreviewLineOptions(side: 'buy' | 'sell', title: string) {
    return {
        color: getSideColor(side),
        lineWidth: 2 as const,
        lineStyle: LINE_STYLES.solid,
        axisLabelVisible: true,
        title,
    }
}

