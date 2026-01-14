import { LINE_STYLES } from './chart-config'

/**
 * Trend line visual configuration
 */
export const TRENDLINE_COLORS = {
    support: '#22c55e', // Green for support
    resistance: '#ef4444', // Red for resistance
    supportBroken: '#22c55e80', // Semi-transparent green for broken support
    resistanceBroken: '#ef444480', // Semi-transparent red for broken resistance
} as const

/**
 * Default trend line detection configuration
 */
export const TRENDLINE_CONFIG = {
    lookbackBars: 5,
    maxLines: 3,
    extendRight: true,
    /** Number of candles to extend the line beyond the end point */
    extendCandles: 15,
} as const

/**
 * Get line series options for trend lines
 */
export function getTrendLineSeriesOptions(
    type: 'support' | 'resistance',
    isBroken: boolean
) {
    const color = isBroken
        ? type === 'support'
            ? TRENDLINE_COLORS.supportBroken
            : TRENDLINE_COLORS.resistanceBroken
        : type === 'support'
          ? TRENDLINE_COLORS.support
          : TRENDLINE_COLORS.resistance

    return {
        color,
        lineWidth: (isBroken ? 1 : 2) as 1 | 2,
        lineStyle: isBroken ? LINE_STYLES.dashed : LINE_STYLES.solid,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
    }
}
