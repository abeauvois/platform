import { Button, Card, CardContent, CardHeader, CardTitle } from '@platform/ui'
import { useDroppable } from '@dnd-kit/core'
import { CandlestickSeries, ColorType, createChart, LineSeries } from 'lightweight-charts'
import { RefreshCw, TrendingUp } from 'lucide-react'
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react'

import { useKlines } from '../hooks/queries'
import { calculateEMA } from '../utils/indicators'

import type { IChartApi, IPriceLine, ISeriesApi, Time } from 'lightweight-charts'
import type { Candlestick } from '../lib/api'

export interface OrderLine {
    id: string
    side: 'buy' | 'sell'
    price: number
    quantity: number
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
}

export const TradingChart = forwardRef<TradingChartHandle, TradingChartProps>(
    function TradingChart(
        { symbol = 'BTCUSDT', interval = '1h', limit = 100, orders = [], currentPrice = 0 },
        ref
    ) {
        const chartContainerRef = useRef<HTMLDivElement>(null)
        const chartRef = useRef<IChartApi | null>(null)
        const candlestickSeriesRef = useRef<ReturnType<IChartApi['addSeries']> | null>(null)
        const ema20SeriesRef = useRef<ISeriesApi<'Line'> | null>(null)
        const priceLinesRef = useRef<Map<string, IPriceLine>>(new Map())
        const previewLineRef = useRef<IPriceLine | null>(null)

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
                    axisLabelVisible: true,
                    title: `${order.side.toUpperCase()} $${orderValue.toFixed(2)} @ ${order.price.toFixed(2)}`,
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
                title: 'EMA 20',
                priceLineVisible: false,
                lastValueVisible: true,
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
                chart.remove()
            }
        }, [symbol, interval, limit])

        // Calculate EMA data when klines change
        const ema20Data = useMemo(() => {
            if (!klinesData?.klines) return []
            return calculateEMA(klinesData.klines, 20)
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

            candlestickSeriesRef.current.setData(chartData)

            // Update EMA 20 data
            if (ema20SeriesRef.current && ema20Data.length > 0) {
                ema20SeriesRef.current.setData(ema20Data)
            }

            // Fit content to view
            chartRef.current?.timeScale().fitContent()
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
                    axisLabelVisible: true,
                    title: `${order.side.toUpperCase()} $${orderValue.toFixed(2)} @ ${order.price.toFixed(2)}`,
                })
                priceLinesRef.current.set(order.id, priceLine)
            }
        }, [orders, symbol])

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
