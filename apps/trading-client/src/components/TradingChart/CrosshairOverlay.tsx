import type { CrosshairInfo } from '../../hooks/chart/useCrosshairInfo'

export interface CrosshairOverlayProps {
    crosshairInfo: CrosshairInfo
}

/**
 * Overlay displaying cursor price variation from last candle
 * Positioned in top-right corner of chart
 */
export function CrosshairOverlay({ crosshairInfo }: Readonly<CrosshairOverlayProps>) {
    const { cursorPrice, priceDiff, percentDiff, isActive } = crosshairInfo

    // Don't show if cursor is not active or no valid data
    if (!isActive || cursorPrice === null || priceDiff === null || percentDiff === null) {
        return null
    }

    const isPositive = priceDiff >= 0
    const colorClass = isPositive ? 'text-green-500' : 'text-red-500'
    const sign = isPositive ? '+' : ''

    // Format price based on magnitude
    const formatPrice = (price: number): string => {
        if (Math.abs(price) >= 1000) {
            return price.toLocaleString('en-US', { maximumFractionDigits: 2 })
        }
        if (Math.abs(price) >= 1) {
            return price.toFixed(2)
        }
        if (Math.abs(price) >= 0.01) {
            return price.toFixed(4)
        }
        return price.toFixed(6)
    }

    return (
        <div className="absolute top-2 right-2 bg-base-300/90 backdrop-blur-sm rounded-lg px-3 py-2 text-sm font-mono pointer-events-none z-10">
            <div className="text-muted-foreground text-xs mb-1">vs Last Close</div>
            <div className={colorClass}>
                <span className="font-semibold">
                    {sign}${formatPrice(priceDiff)}
                </span>
                <span className="ml-2 text-xs">
                    ({sign}{percentDiff.toFixed(2)}%)
                </span>
            </div>
        </div>
    )
}
