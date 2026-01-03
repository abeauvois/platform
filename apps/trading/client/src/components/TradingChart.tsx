import { Button, Card, CardContent, CardHeader, CardTitle } from '@platform/ui'
import { CandlestickSeries, ColorType, createChart } from 'lightweight-charts'
import { RefreshCw, TrendingUp } from 'lucide-react'
import { useEffect, useRef } from 'react'

import type { IChartApi } from 'lightweight-charts'

interface Candlestick {
    openTime: number
    open: number
    high: number
    low: number
    close: number
    volume: number
    closeTime: number
}

interface TradingChartProps {
    symbol?: string
    interval?: string
    limit?: number
}

export function TradingChart({
    symbol = 'BTCUSDT',
    interval = '1h',
    limit = 100
}: Readonly<TradingChartProps>) {
    const chartContainerRef = useRef<HTMLDivElement>(null)
    const chartRef = useRef<IChartApi | null>(null)
    const candlestickSeriesRef = useRef<any>(null)

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
            chart.remove()
        }
    }, [symbol, interval, limit])

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
        <Card>
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
                <div ref={chartContainerRef} className="w-full" />
            </CardContent>
        </Card>
    )
}
