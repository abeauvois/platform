import { useEffect, useRef, useCallback } from 'react'

/**
 * Order from the backend
 */
export interface Order {
    id: string
    symbol: string
    side: 'buy' | 'sell'
    type: 'market' | 'limit' | 'stop' | 'stop_limit'
    quantity: number
    price?: number
    status: 'pending' | 'filled' | 'partially_filled' | 'cancelled' | 'rejected'
    filledQuantity: number
    createdAt: string
    updatedAt: string
}

/**
 * Order update event from SSE stream
 */
export interface OrderUpdateEvent {
    eventType: 'ORDER_UPDATE'
    eventTime: number
    order: Order
}

/**
 * Callback type for order updates
 */
export type OrderUpdateCallback = (event: OrderUpdateEvent) => void

/**
 * Hook to subscribe to real-time order updates via SSE
 *
 * @param onOrderUpdate - Callback when an order is updated (filled, cancelled, etc.)
 * @param enabled - Whether to enable the connection (default: true)
 * @returns Object with connection status
 */
export function useOrderUpdates(
    onOrderUpdate: OrderUpdateCallback,
    enabled = true
) {
    const eventSourceRef = useRef<EventSource | null>(null)
    const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const onOrderUpdateRef = useRef(onOrderUpdate)

    // Keep callback ref updated
    onOrderUpdateRef.current = onOrderUpdate

    const connect = useCallback(() => {
        if (eventSourceRef.current) {
            return
        }

        // EventSource with credentials to send session cookies
        const eventSource = new EventSource('/api/trading/order-stream/stream', {
            withCredentials: true,
        })
        eventSourceRef.current = eventSource

        eventSource.addEventListener('connected', (e) => {
            console.log('[useOrderUpdates] Connected:', JSON.parse(e.data))
        })

        eventSource.addEventListener('order_update', (e) => {
            try {
                const event: OrderUpdateEvent = JSON.parse(e.data)
                console.log('[useOrderUpdates] Order update:', event)
                onOrderUpdateRef.current(event)
            } catch (error) {
                console.error('[useOrderUpdates] Failed to parse order update:', error)
            }
        })

        eventSource.addEventListener('ping', () => {
            // Keep-alive ping, no action needed
        })

        eventSource.onerror = (error) => {
            console.error('[useOrderUpdates] Connection error:', error)
            eventSource.close()
            eventSourceRef.current = null

            // Attempt to reconnect after 5 seconds
            if (enabled) {
                reconnectTimeoutRef.current = setTimeout(() => {
                    console.log('[useOrderUpdates] Attempting to reconnect...')
                    connect()
                }, 5000)
            }
        }
    }, [enabled])

    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current)
            reconnectTimeoutRef.current = null
        }

        if (eventSourceRef.current) {
            eventSourceRef.current.close()
            eventSourceRef.current = null
        }
    }, [])

    useEffect(() => {
        if (enabled) {
            connect()
        } else {
            disconnect()
        }

        return () => {
            disconnect()
        }
    }, [enabled, connect, disconnect])

    return {
        isConnected: eventSourceRef.current?.readyState === EventSource.OPEN,
    }
}
