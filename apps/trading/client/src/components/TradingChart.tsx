import { Button, Card, CardContent, CardHeader, CardTitle } from '@platform/ui'
import { useDroppable } from '@dnd-kit/core'
import { CandlestickSeries, ColorType, createChart } from 'lightweight-charts'
import { RefreshCw, TrendingUp } from 'lucide-react'
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react'

import type { IChartApi, IPriceLine } from 'lightweight-charts'

interface Candlestick {
    openTime: number
    open: number
    high: number
    low: number
    close: number
    volume: number
    closeTime: number
}

export interface OrderLine {
    id: string
    side: 'buy' | 'sell'
    price: number
}

export interface TradingChartHandle {
    getPriceAtY: (y: number) => number | null
    getChartRect: () => DOMRect | null
    addOrderLine: (order: OrderLine) => void
    removeOrderLine: (orderId: string) => void
    showPreviewLine: (price: number, side: 'buy' | 'sell') => void
    hidePreviewLine: () => void
}

interface TradingChartProps {
    symbol?: string
    interval?: string
    limit?: number
    orders?: Array<OrderLine>
    currentPrice?: number
    lastUpdate?: number
}

export const TradingChart = forwardRef<TradingChartHandle, TradingChartProps>(
    function TradingChart(
        { symbol = 'BTCUSDT', interval = '1h', limit = 100, orders = [], currentPrice = 0, lastUpdate },
        ref
    ) {
        const chartContainerRef = useRef<HTMLDivElement>(null)
        const chartRef = useRef<IChartApi | null>(null)
        const candlestickSeriesRef = useRef<ReturnType<IChartApi['addSeries']> | null>(null)
        const priceLinesRef = useRef<Map<string, IPriceLine>>(new Map())
        const previewLineRef = useRef<IPriceLine | null>(null)

        const { setNodeRef, isOver } = useDroppable({
            id: 'trading-chart-drop-zone',
        })

        // Combine refs for the chart container
        const setRefs = useCallback((node: HTMLDivElement | null) => {
            chartContainerRef.current = node
            setNodeRef(node)
        }, [setNodeRef])

        // Expose methods to parent via ref
        useImperativeHandle(ref, () => ({
            getPriceAtY: (y: number): number | null => {
                if (!candlestickSeriesRef.current || !chartContainerRef.current) return null
                const rect = chartContainerRef.current.getBoundingClientRect()
                const relativeY = y - rect.top
                return candlestickSeriesRef.current.coordinateToPrice(relativeY)
            },
            getChartRect: (): DOMRect | null => {
                return chartContainerRef.current?.getBoundingClientRect() ?? null
            },
            addOrderLine: (order: OrderLine) => {
                if (!candlestickSeriesRef.current) return

                // Remove existing line with same id if present
                const existingLine = priceLinesRef.current.get(order.id)
                if (existingLine) {
                    candlestickSeriesRef.current.removePriceLine(existingLine)
                }

                const priceLine = candlestickSeriesRef.current.createPriceLine({
                    price: order.price,
                    color: order.side === 'buy' ? '#22c55e' : '#ef4444',
                    lineWidth: 2,
                    lineStyle: 2, // Dashed
                    axisLabelVisible: true,
                    title: `${order.side.toUpperCase()} @ ${order.price.toFixed(2)}`,
                })
                priceLinesRef.current.set(order.id, priceLine)
            },
            removeOrderLine: (orderId: string) => {
                const priceLine = priceLinesRef.current.get(orderId)
                if (priceLine && candlestickSeriesRef.current) {
                    candlestickSeriesRef.current.removePriceLine(priceLine)
                    priceLinesRef.current.delete(orderId)
                }
            },
            showPreviewLine: (price: number, side: 'buy' | 'sell') => {
                if (!candlestickSeriesRef.current) return

                // Remove existing preview line
                if (previewLineRef.current) {
                    candlestickSeriesRef.current.removePriceLine(previewLineRef.current)
                }

                // Calculate percentage distance from current price
                let percentLabel = ''
                if (currentPrice > 0) {
                    const percentDiff = ((price - currentPrice) / currentPrice) * 100
                    const sign = percentDiff >= 0 ? '+' : ''
                    percentLabel = ` (${sign}${percentDiff.toFixed(2)}%)`
                }

                // Create new preview line
                previewLineRef.current = candlestickSeriesRef.current.createPriceLine({
                    price,
                    color: side === 'buy' ? '#22c55e' : '#ef4444',
                    lineWidth: 2,
                    lineStyle: 0, // Solid line for preview
                    axisLabelVisible: true,
                    title: `${side.toUpperCase()} @ ${price.toFixed(2)}${percentLabel}`,
                })
            },
            hidePreviewLine: () => {
                if (previewLineRef.current && candlestickSeriesRef.current) {
                    candlestickSeriesRef.current.removePriceLine(previewLineRef.current)
                    previewLineRef.current = null
                }
            },
        }), [currentPrice])

        useEffect(() => {
            if (!chartContainerRef.current) return

            // Create chart instance
            const chart = createChart(chartContainerRef.current, {
                layout: {
                    background: { type: ColorType.Solid, color: '#1a1a1a' },
                    textColor: '#d1d5db',
                },
                width: chartContainerRef.current.clientWidth,
                height: 500,
                grid: {
                    vertLines: { color: '#2a2a2a' },
                    horzLines: { color: '#2a2a2a' },
                },
                crosshair: {
                    mode: 1,
                },
                rightPriceScale: {
                    borderColor: '#2a2a2a',
                },
                timeScale: {
                    borderColor: '#2a2a2a',
                    timeVisible: true,
                    secondsVisible: false,
                },
            })

            // Add candlestick series using v5 API
            const candlestickSeries = chart.addSeries(CandlestickSeries, {
                upColor: '#22c55e',
                downColor: '#ef4444',
                borderVisible: false,
                wickUpColor: '#22c55e',
                wickDownColor: '#ef4444',
            })

            chartRef.current = chart
            candlestickSeriesRef.current = candlestickSeries

            // Handle window resize
            const handleResize = () => {
                if (chartContainerRef.current && chartRef.current) {
                    chartRef.current.applyOptions({
                        width: chartContainerRef.current.clientWidth,
                    })
                }
            }

            window.addEventListener('resize', handleResize)

            // Fetch and display data
            fetchAndDisplayKlines()

            // Cleanup
            return () => {
                window.removeEventListener('resize', handleResize)
                priceLinesRef.current.clear()
                chart.remove()
            }
        }, [symbol, interval, limit])

        // Redraw order lines when orders change or chart re-initializes
        useEffect(() => {
            if (!candlestickSeriesRef.current) return

            // Clear existing order lines
            for (const [id, priceLine] of priceLinesRef.current) {
                candlestickSeriesRef.current.removePriceLine(priceLine)
                priceLinesRef.current.delete(id)
            }

            // Redraw all pending/partially_filled orders
            for (const order of orders) {
                const priceLine = candlestickSeriesRef.current.createPriceLine({
                    price: order.price,
                    color: order.side === 'buy' ? '#22c55e' : '#ef4444',
                    lineWidth: 2,
                    lineStyle: 2, // Dashed
                    axisLabelVisible: true,
                    title: `${order.side.toUpperCase()} @ ${order.price.toFixed(2)}`,
                })
                priceLinesRef.current.set(order.id, priceLine)
            }
        }, [orders, symbol])

        // Sync chart data with lastUpdate timestamp from useTradingData
        useEffect(() => {
            if (!lastUpdate || !candlestickSeriesRef.current) return
            fetchAndDisplayKlines()
        }, [lastUpdate])

        async function fetchAndDisplayKlines() {
            try {
                const response = await fetch(
                    `/api/trading/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
                )

                if (!response.ok) {
                    throw new Error('Failed to fetch klines')
                }

                const data = await response.json()

                // Transform data for Lightweight Charts
                const chartData = data.klines.map((k: Candlestick) => ({
                    time: Math.floor(k.openTime / 1000), // Convert to seconds
                    open: k.open,
                    high: k.high,
                    low: k.low,
                    close: k.close,
                }))

                candlestickSeriesRef.current?.setData(chartData)

                // Fit content to view
                chartRef.current?.timeScale().fitContent()
            } catch (error) {
                console.error('Failed to fetch klines:', error)
            }
        }

        const handleRefresh = () => {
            fetchAndDisplayKlines()
        }

        return (
            <Card className={isOver ? 'ring-2 ring-yellow-500' : ''}>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="w-6 h-6 text-accent" />
                        {symbol} Chart ({interval})
                    </CardTitle>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full"
                        onClick={handleRefresh}
                    >
                        <RefreshCw className="w-4 h-4" />
                    </Button>
                </CardHeader>
                <CardContent>
                    <div
                        ref={setRefs}
                        className={`w-full transition-all ${isOver ? 'opacity-90' : ''}`}
                    />
                    {isOver && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="bg-yellow-500/20 text-yellow-500 px-4 py-2 rounded-lg font-medium">
                                Release to place order at this price
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        )
    }
)
