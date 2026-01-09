import { Button, Card, CardContent, CardHeader, CardTitle } from '@platform/ui'
import { calculateEMA, calculatePricePrecision, formatPrice, getMinMove } from '@platform/trading-domain'
import { useDroppable } from '@dnd-kit/core'
import { CandlestickSeries, ColorType, LineSeries, createChart } from 'lightweight-charts'
import { RefreshCw, TrendingUp } from 'lucide-react'
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react'

import { useKlines } from '../hooks/queries'

import type { IChartApi, IPriceLine, ISeriesApi, Time } from 'lightweight-charts'
import type { Candlestick } from '@platform/trading-domain'

export interface OrderLine {
    id: string
    side: 'buy' | 'sell'
    price: number
    quantity: number
}

export interface OrderHistoryItem {
    id: string
    side: 'buy' | 'sell'
    price: number
    time: number // Unix timestamp in seconds
}

/**
 * Parse interval string to seconds
 * @param interval - Interval string (e.g., '1m', '1h', '1d')
 * @returns Interval in seconds
 */
function parseIntervalToSeconds(interval: string): number {
    const unit = interval.slice(-1)
    const value = parseInt(interval.slice(0, -1), 10)

    switch (unit) {
        case 's':
            return value
        case 'm':
            return value * 60
        case 'h':
            return value * 60 * 60
        case 'd':
            return value * 60 * 60 * 24
        case 'w':
            return value * 60 * 60 * 24 * 7
        case 'M':
            return value * 60 * 60 * 24 * 30
        default:
            return 60 * 60 // Default to 1 hour
    }
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
    orderHistory?: Array<OrderHistoryItem>
    currentPrice?: number
}

export const TradingChart = forwardRef<TradingChartHandle, TradingChartProps>(
    function TradingChart(
        { symbol = 'BTCUSDT', interval = '1h', limit = 100, orders = [], orderHistory = [], currentPrice = 0 },
        ref
    ) {
        const chartContainerRef = useRef<HTMLDivElement>(null)
        const chartRef = useRef<IChartApi | null>(null)
        const candlestickSeriesRef = useRef<ReturnType<IChartApi['addSeries']> | null>(null)
        const ema20SeriesRef = useRef<ISeriesApi<'Line'> | null>(null)
        const orderHistorySeriesRef = useRef<Map<string, ISeriesApi<'Line'>>>(new Map())
        const priceLinesRef = useRef<Map<string, IPriceLine>>(new Map())
        const previewLineRef = useRef<IPriceLine | null>(null)
        // Track if chart data has been initially loaded (to preserve zoom/pan on data refreshes)
        const chartInitializedRef = useRef(false)

        // Use TanStack Query for klines data
        const { data: klinesData, refetch: refetchKlines } = useKlines({
            symbol,
            interval,
            limit,
        })

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

                const orderValue = order.price * order.quantity
                const priceLine = candlestickSeriesRef.current.createPriceLine({
                    price: order.price,
                    color: order.side === 'buy' ? '#22c55e' : '#ef4444',
                    lineWidth: 2,
                    lineStyle: 2, // Dashed
                    axisLabelVisible: false, // Hide axis label to avoid cluttering price axis
                    title: `${order.side.toUpperCase()} $${orderValue.toFixed(2)}`,
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
                    title: `${side.toUpperCase()} @ ${formatPrice(price)}${percentLabel}`,
                })
            },
            hidePreviewLine: () => {
                if (previewLineRef.current && candlestickSeriesRef.current) {
                    candlestickSeriesRef.current.removePriceLine(previewLineRef.current)
                    previewLineRef.current = null
                }
            },
        }), [currentPrice])

        // Initialize chart
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

            // Add EMA 20 line series
            const ema20Series = chart.addSeries(LineSeries, {
                color: '#f59e0b', // Amber color for EMA
                lineWidth: 2,
                priceLineVisible: false,
                lastValueVisible: false, // Hide to avoid cluttering price axis
            })

            chartRef.current = chart
            candlestickSeriesRef.current = candlestickSeries
            ema20SeriesRef.current = ema20Series

            // Handle window resize
            const handleResize = () => {
                if (chartContainerRef.current && chartRef.current) {
                    chartRef.current.applyOptions({
                        width: chartContainerRef.current.clientWidth,
                    })
                }
            }

            window.addEventListener('resize', handleResize)

            // Cleanup
            return () => {
                window.removeEventListener('resize', handleResize)
                priceLinesRef.current.clear()
                orderHistorySeriesRef.current.clear()
                chart.remove()
                // Reset initialized flag so next symbol load will fitContent
                chartInitializedRef.current = false
            }
        }, [symbol, interval, limit])

        // Calculate EMA data when klines change
        const ema20Data = useMemo(() => {
            if (!klinesData?.klines) return []
            // Cast time to chart library's Time type
            return calculateEMA(klinesData.klines, 20).map(p => ({
                ...p,
                time: p.time as Time,
            }))
        }, [klinesData])

        // Update chart when klines data changes
        useEffect(() => {
            if (!klinesData || !candlestickSeriesRef.current) return

            // Transform data for Lightweight Charts
            const chartData = klinesData.klines.map((k: Candlestick) => ({
                time: Math.floor(k.openTime / 1000) as Time, // Convert to seconds
                open: k.open,
                high: k.high,
                low: k.low,
                close: k.close,
            }))

            // Calculate price precision based on data
            const lastCandle = klinesData.klines.at(-1)
            if (!lastCandle) return
            const pricePrecision = calculatePricePrecision(lastCandle.close)
            const minMove = getMinMove(pricePrecision)

            // Update series price format for low-value tokens
            candlestickSeriesRef.current.applyOptions({
                priceFormat: {
                    type: 'price',
                    precision: pricePrecision,
                    minMove: minMove,
                },
            })

            // Update EMA series price format too
            if (ema20SeriesRef.current) {
                ema20SeriesRef.current.applyOptions({
                    priceFormat: {
                        type: 'price',
                        precision: pricePrecision,
                        minMove: minMove,
                    },
                })
            }

            candlestickSeriesRef.current.setData(chartData)

            // Update EMA 20 data
            if (ema20SeriesRef.current && ema20Data.length > 0) {
                ema20SeriesRef.current.setData(ema20Data)
            }

            // Only fit content on initial load, preserve zoom/pan on data refreshes
            if (!chartInitializedRef.current) {
                chartRef.current?.timeScale().fitContent()
                chartInitializedRef.current = true
            }
        }, [klinesData, ema20Data])

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
                const orderValue = order.price * order.quantity
                const priceLine = candlestickSeriesRef.current.createPriceLine({
                    price: order.price,
                    color: order.side === 'buy' ? '#22c55e' : '#ef4444',
                    lineWidth: 2,
                    lineStyle: 2, // Dashed
                    axisLabelVisible: false, // Hide axis label to avoid cluttering price axis
                    title: `${order.side.toUpperCase()} $${orderValue.toFixed(2)}`,
                })
                priceLinesRef.current.set(order.id, priceLine)
            }
        }, [orders, symbol])

        // Update order history lines when orderHistory changes
        useEffect(() => {
            if (!chartRef.current || !klinesData?.klines.length) return

            const chart = chartRef.current

            // Calculate half the line width in seconds (1.5 candles on each side = 3 candles total)
            const intervalSeconds = parseIntervalToSeconds(interval)
            const halfLineWidth = intervalSeconds * 1.5

            // Get the visible time range from klines data
            const firstKline = klinesData.klines[0]
            const lastKline = klinesData.klines.at(-1)
            const chartStartTime = Math.floor(firstKline.openTime / 1000) // Convert to seconds
            const chartEndTime = Math.floor(lastKline.closeTime / 1000) // Convert to seconds

            // Filter orders to only those within the visible time range
            const visibleOrders = orderHistory.filter((order) => {
                return order.time >= chartStartTime && order.time <= chartEndTime
            })

            // Get current order IDs in the visible history
            const currentOrderIds = new Set(visibleOrders.map((o) => o.id))

            // Remove series for orders no longer visible
            for (const [orderId, series] of orderHistorySeriesRef.current) {
                if (!currentOrderIds.has(orderId)) {
                    chart.removeSeries(series)
                    orderHistorySeriesRef.current.delete(orderId)
                }
            }

            // Add or update series for each visible order
            for (const order of visibleOrders) {
                if (!order.price) continue

                let series = orderHistorySeriesRef.current.get(order.id)

                // Create new series if it doesn't exist
                if (!series) {
                    series = chart.addSeries(LineSeries, {
                        color: order.side === 'buy' ? '#22c55e' : '#ef4444',
                        lineWidth: 3,
                        priceLineVisible: false,
                        lastValueVisible: false,
                        crosshairMarkerVisible: false,
                    })
                    orderHistorySeriesRef.current.set(order.id, series)
                }

                // Set data for this order's series (2 points at same price, different times)
                series.setData([
                    { time: (order.time - halfLineWidth) as Time, value: order.price },
                    { time: (order.time + halfLineWidth) as Time, value: order.price },
                ])
            }
        }, [orderHistory, interval, klinesData])

        const handleRefresh = () => {
            refetchKlines()
        }

        return (
            <Card className={isOver ? 'ring-2 ring-yellow-500' : ''}>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="w-6 h-6 text-primary" />
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
