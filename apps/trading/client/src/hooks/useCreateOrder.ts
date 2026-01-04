import { useMutation, useQueryClient } from '@tanstack/react-query'

export interface CreateOrderRequest {
    symbol: string
    side: 'buy' | 'sell'
    type: 'limit' | 'market'
    quantity: number
    price: number
    timeInForce?: 'GTC' | 'IOC' | 'FOK'
}

export interface OrderResponse {
    id: string
    symbol: string
    side: 'buy' | 'sell'
    type: 'limit' | 'market'
    quantity: number
    price: number
    status: 'pending' | 'filled' | 'partially_filled' | 'cancelled' | 'rejected'
    filledQuantity: number
    createdAt: string
    updatedAt: string
}

async function createOrder(data: CreateOrderRequest): Promise<OrderResponse> {
    const response = await fetch('/api/trading/order', {
        method: 'POST',
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

    return useMutation({
        mutationFn: createOrder,
        onSuccess: () => {
            // Invalidate any order-related queries
            queryClient.invalidateQueries({ queryKey: ['orders'] })
            // Also refresh balances since an order affects available balance
            queryClient.invalidateQueries({ queryKey: ['balances'] })
        },
    })
}
