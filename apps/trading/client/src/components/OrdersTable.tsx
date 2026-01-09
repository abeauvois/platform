import { Card, CardContent, CardHeader, CardTitle } from '@platform/ui'
import { ListOrdered } from 'lucide-react'

export type OrderType = 'limit' | 'market' | 'stop_loss' | 'stop_loss_limit' | 'take_profit' | 'take_profit_limit' | 'stop' | 'stop_limit'

export interface PlacedOrder {
    id: string
    symbol: string
    side: 'buy' | 'sell'
    type: OrderType
    price: number
    quantity: number
    status: 'pending' | 'filled' | 'partially_filled' | 'cancelled' | 'rejected'
    createdAt: Date
}

interface OrdersTableProps {
    orders: PlacedOrder[]
    onCancelOrder?: (orderId: string) => void
}

export function OrdersTable({ orders, onCancelOrder }: Readonly<OrdersTableProps>) {
    if (orders.length === 0) {
        return (
            <Card className="bg-card/50 backdrop-blur">
                <CardContent className="p-4">
                    <p className="text-center text-muted-foreground text-sm">
                        No orders placed yet. Drag a Buy or Sell button onto the chart to place an order.
                    </p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="bg-card/50 backdrop-blur">
            <CardHeader className="py-3">
                <CardTitle className="flex items-center gap-2 text-base">
                    <ListOrdered className="w-5 h-5" />
                    Orders ({orders.length})
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/30 text-muted-foreground">
                            <tr>
                                <th className="text-left px-4 py-2 font-medium">Time</th>
                                <th className="text-left px-4 py-2 font-medium">Side</th>
                                <th className="text-left px-4 py-2 font-medium">Type</th>
                                <th className="text-left px-4 py-2 font-medium">Symbol</th>
                                <th className="text-right px-4 py-2 font-medium">Price</th>
                                <th className="text-right px-4 py-2 font-medium">Amount</th>
                                <th className="text-center px-4 py-2 font-medium">Status</th>
                                <th className="text-center px-4 py-2 font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map((order) => (
                                <tr key={order.id} className="border-t border-muted/20 hover:bg-muted/10">
                                    <td className="px-4 py-2">{order.createdAt.toLocaleTimeString()}</td>
                                    <td className="px-4 py-2">
                                        <span
                                            className={`font-medium ${order.side === 'buy' ? 'text-green-500' : 'text-red-500'
                                                }`}
                                        >
                                            {order.side.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2">
                                        <OrderTypeBadge type={order.type} />
                                    </td>
                                    <td className="px-4 py-2">{order.symbol}</td>
                                    <td className="px-4 py-2 text-right font-mono">
                                        {order.price.toLocaleString(undefined, {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 8,
                                        })}
                                    </td>
                                    <td className="px-4 py-2 text-right font-mono">
                                        {order.quantity.toLocaleString(undefined, {
                                            minimumFractionDigits: 4,
                                            maximumFractionDigits: 8,
                                        })}
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                        <StatusBadge status={order.status} />
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                        {order.status === 'pending' && onCancelOrder && (
                                            <button
                                                type="button"
                                                onClick={() => onCancelOrder(order.id)}
                                                className="text-xs text-red-400 hover:text-red-300 underline"
                                            >
                                                Cancel
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    )
}

function StatusBadge({ status }: { status: PlacedOrder['status'] }) {
    const statusConfig: Record<PlacedOrder['status'], { label: string; className: string }> = {
        pending: {
            label: 'PENDING',
            className: 'bg-yellow-500/20 text-yellow-500',
        },
        filled: {
            label: 'FILLED',
            className: 'bg-green-500/20 text-green-500',
        },
        partially_filled: {
            label: 'PARTIAL',
            className: 'bg-blue-500/20 text-blue-500',
        },
        cancelled: {
            label: 'CANCELLED',
            className: 'bg-gray-500/20 text-gray-400',
        },
        rejected: {
            label: 'REJECTED',
            className: 'bg-red-500/20 text-red-500',
        },
    }

    const config = statusConfig[status]

    return (
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${config.className}`}>
            {config.label}
        </span>
    )
}

function OrderTypeBadge({ type }: { type: OrderType }) {
    const typeConfig: Record<OrderType, { label: string; className: string }> = {
        limit: {
            label: 'LIMIT',
            className: 'bg-blue-500/20 text-blue-400',
        },
        market: {
            label: 'MARKET',
            className: 'bg-purple-500/20 text-purple-400',
        },
        stop_loss: {
            label: 'STOP LOSS',
            className: 'bg-red-500/20 text-red-400',
        },
        stop_loss_limit: {
            label: 'STOP LOSS LMT',
            className: 'bg-red-500/20 text-red-400',
        },
        take_profit: {
            label: 'TAKE PROFIT',
            className: 'bg-green-500/20 text-green-400',
        },
        take_profit_limit: {
            label: 'TAKE PROFIT LMT',
            className: 'bg-green-500/20 text-green-400',
        },
        stop: {
            label: 'STOP',
            className: 'bg-orange-500/20 text-orange-400',
        },
        stop_limit: {
            label: 'STOP LIMIT',
            className: 'bg-orange-500/20 text-orange-400',
        },
    }

    const config = typeConfig[type] ?? { label: type.toUpperCase(), className: 'bg-gray-500/20 text-gray-400' }

    return (
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${config.className}`}>
            {config.label}
        </span>
    )
}
