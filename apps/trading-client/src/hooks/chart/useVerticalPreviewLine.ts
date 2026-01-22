import { useCallback, useRef } from 'react'

import { CHART_COLORS } from '../../components/TradingChart/chart-config'

import type { IChartApi, Time } from 'lightweight-charts'

export interface UseVerticalPreviewLineParams {
    chartRef: React.MutableRefObject<IChartApi | null>
    chartContainerRef: React.RefObject<HTMLDivElement | null>
}

export interface UseVerticalPreviewLineReturn {
    showVerticalPreviewLine: (time: number) => void
    hideVerticalPreviewLine: () => void
    getTimeAtX: (x: number) => number | null
}

/**
 * Hook to manage vertical preview line during drag operations
 *
 * Uses a CSS overlay approach since lightweight-charts doesn't
 * natively support vertical lines spanning the entire chart height.
 */
export function useVerticalPreviewLine({
    chartRef,
    chartContainerRef,
}: UseVerticalPreviewLineParams): UseVerticalPreviewLineReturn {
    // Track the preview line element
    const previewLineElement = useRef<HTMLDivElement | null>(null)

    // Convert pixel X coordinate to timestamp (Unix ms)
    const getTimeAtX = useCallback(
        (x: number): number | null => {
            if (!chartRef.current || !chartContainerRef.current) return null

            const rect = chartContainerRef.current.getBoundingClientRect()
            const relativeX = x - rect.left

            // Use timeScale to convert coordinate to time
            const timeScale = chartRef.current.timeScale()
            const time = timeScale.coordinateToTime(relativeX)

            if (time === null) return null

            // lightweight-charts returns time as seconds, convert to ms
            return (time as number) * 1000
        },
        [chartRef, chartContainerRef]
    )

    // Show vertical preview line at a given timestamp
    const showVerticalPreviewLine = useCallback(
        (time: number) => {
            if (!chartRef.current || !chartContainerRef.current) return

            const timeScale = chartRef.current.timeScale()
            // Convert ms to seconds for the chart
            const timeSeconds = Math.floor(time / 1000) as Time
            const x = timeScale.timeToCoordinate(timeSeconds)

            if (x === null) return

            // Create or update the preview line element
            if (!previewLineElement.current) {
                const line = document.createElement('div')
                line.style.position = 'absolute'
                line.style.top = '0'
                line.style.bottom = '0'
                line.style.width = '2px'
                line.style.backgroundColor = CHART_COLORS.verticalPreview
                line.style.pointerEvents = 'none'
                line.style.zIndex = '10'
                line.style.opacity = '0.8'
                chartContainerRef.current.appendChild(line)
                previewLineElement.current = line
            }

            previewLineElement.current.style.left = `${x}px`
            previewLineElement.current.style.display = 'block'
        },
        [chartRef, chartContainerRef]
    )

    // Hide the vertical preview line
    const hideVerticalPreviewLine = useCallback(() => {
        if (previewLineElement.current) {
            previewLineElement.current.style.display = 'none'
        }
    }, [])

    return {
        showVerticalPreviewLine,
        hideVerticalPreviewLine,
        getTimeAtX,
    }
}
