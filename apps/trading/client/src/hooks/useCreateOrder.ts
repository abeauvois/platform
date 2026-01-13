import { useMutation, useQueryClient } from '@tanstack/react-query'

import { authClient } from '../lib/auth-client'
import { onOrderCompleted } from '../lib/cache-utils'

export type OrderType = 'limit' | 'market' | 'stop_loss' | 'stop_loss_limit' | 'take_profit' | 'take_profit_limit'

export interface CreateOrderRequest {
    symbol: string
    side: 'buy' | 'sell'
    type: OrderType
    quantity: number
    price?: number
    stopPrice?: number
    timeInForce?: 'GTC' | 'IOC' | 'FOK'
    /** Whether to place order on margin account (default: false = spot) */
    isMarginOrder?: boolean
}

export interface OrderResponse {
    id: string
    symbol: string
    side: 'buy' | 'sell'
    type: OrderType
    quantity: number
    price?: number
    stopPrice?: number
    status: 'pending' | 'filled' | 'partially_filled' | 'cancelled' | 'rejected'
    filledQuantity: number
    createdAt: string
    updatedAt: string
}

async function createOrder(data: CreateOrderRequest): Promise<OrderResponse> {
    const response = await fetch('/api/trading/order', {
        method: 'POST',
        credentials: 'include', // Send session cookies
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            ...data,
            type: data.type ?? 'limit',
            timeInForce: data.timeInForce ?? 'GTC',
        }),
    })

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Order creation failed' }))
        throw new Error(error.message || error.error || 'Order creation failed')
    }

    return response.json()
}

export function useCreateOrder() {
    const queryClient = useQueryClient()
    const { data: session } = authClient.useSession()

    const mutation = useMutation({
        mutationFn: async (data: CreateOrderRequest) => {
            // Check authentication before submitting order
            if (!session) {
                throw new Error('Authentication required: Please sign in to place orders')
            }
            return createOrder(data)
        },
        onSuccess: () => {
            // Invalidate order and balance queries using centralized cache utils
            onOrderCompleted(queryClient)
        },
    })

    return {
        ...mutation,
        isAuthenticated: !!session,
    }
}
