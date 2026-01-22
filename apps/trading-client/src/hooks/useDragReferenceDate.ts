import { PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { useCallback, useState } from 'react'

import type { DragEndEvent, DragMoveEvent, DragStartEvent } from '@dnd-kit/core'
import type { RefObject } from 'react'

import type { TradingChartHandle } from '../components/TradingChart'

export interface UseDragReferenceDateConfig {
    /** Reference to the trading chart handle */
    chartRef: RefObject<TradingChartHandle | null>
    /** Callback to update global reference timestamp */
    onUpdateReference: (timestamp: number | null) => void
}

export interface UseDragReferenceDateReturn {
    /** Configured sensors for DndContext */
    sensors: ReturnType<typeof useSensors>
    /** ID of the currently dragged item (null if not dragging) */
    activeDragId: string | null
    /** Whether reference drag is currently active */
    isReferenceDragActive: boolean
    /** Handler for drag start */
    handleReferenceDragStart: (event: DragStartEvent) => void
    /** Handler for drag move (shows vertical preview line on chart) */
    handleReferenceDragMove: (event: DragMoveEvent) => void
    /** Handler for drag end (saves reference timestamp) */
    handleReferenceDragEnd: (event: DragEndEvent) => void
}

/** Drag ID for the set reference button */
export const SET_REFERENCE_DRAG_ID = 'set-reference-button'

/**
 * Hook to manage drag-and-drop reference date selection
 *
 * Handles:
 * - DnD sensor configuration
 * - Vertical preview line display during drag
 * - Reference timestamp saving on drop (global, applies to all watchlist items)
 */
export function useDragReferenceDate(config: UseDragReferenceDateConfig): UseDragReferenceDateReturn {
    const { chartRef, onUpdateReference } = config

    const [activeDragId, setActiveDragId] = useState<string | null>(null)

    // Configure sensors with activation distance
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    )

    // Check if we're dragging the reference button
    const isReferenceDragActive = activeDragId === SET_REFERENCE_DRAG_ID

    // Handle drag start
    const handleReferenceDragStart = useCallback((event: DragStartEvent) => {
        const id = String(event.active.id)
        if (id === SET_REFERENCE_DRAG_ID) {
            setActiveDragId(id)
        }
    }, [])

    // Handle drag move - show vertical preview line on chart
    const handleReferenceDragMove = useCallback(
        (event: DragMoveEvent) => {
            const { active } = event
            if (String(active.id) !== SET_REFERENCE_DRAG_ID) return

            // Calculate current X position
            const deltaX = event.delta.x
            const currentX =
                event.activatorEvent instanceof MouseEvent ? event.activatorEvent.clientX + deltaX : 0

            const timestamp = chartRef.current?.getTimeAtX(currentX)
            if (timestamp && timestamp > 0) {
                chartRef.current?.showVerticalPreviewLine(timestamp)
            }
        },
        [chartRef]
    )

    // Handle drag end - save global reference timestamp
    const handleReferenceDragEnd = useCallback(
        (event: DragEndEvent) => {
            const { active, over } = event

            // Hide preview line
            chartRef.current?.hideVerticalPreviewLine()
            setActiveDragId(null)

            if (String(active.id) !== SET_REFERENCE_DRAG_ID) return

            // Check if dropped over the chart
            if (!over || over.id !== 'trading-chart-drop-zone') {
                console.log('[DragReference] Not dropped on chart, aborting')
                return
            }

            // Get the timestamp at the drop position
            const deltaX = event.delta.x
            const dropX =
                event.activatorEvent instanceof MouseEvent ? event.activatorEvent.clientX + deltaX : 0

            const timestamp = chartRef.current?.getTimeAtX(dropX)
            console.log('[DragReference] Calculated timestamp:', timestamp)

            if (!timestamp || timestamp <= 0) {
                console.warn('[DragReference] Invalid timestamp, aborting')
                return
            }

            // Update the reference marker on the chart
            chartRef.current?.setReferenceMarker(timestamp)

            // Save the global reference timestamp via callback
            onUpdateReference(timestamp)
        },
        [chartRef, onUpdateReference]
    )

    return {
        sensors,
        activeDragId,
        isReferenceDragActive,
        handleReferenceDragStart,
        handleReferenceDragMove,
        handleReferenceDragEnd,
    }
}
