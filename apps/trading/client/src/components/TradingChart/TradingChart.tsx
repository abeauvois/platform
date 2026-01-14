import { Button, Card, CardContent, CardHeader, CardTitle } from '@platform/ui'
import { useDroppable } from '@dnd-kit/core'
import { RefreshCw, Star, StarOff, TrendingUp } from 'lucide-react'
import { forwardRef, useCallback, useImperativeHandle } from 'react'

import { useChartData } from '../../hooks/chart/useChartData'
import { useChartInstance } from '../../hooks/chart/useChartInstance'
import { useCrosshairInfo } from '../../hooks/chart/useCrosshairInfo'
import { useOrderHistorySeries } from '../../hooks/chart/useOrderHistorySeries'
import { useOrderLines } from '../../hooks/chart/useOrderLines'
import { usePreviewLine } from '../../hooks/chart/usePreviewLine'
import { useTrendLines } from '../../hooks/chart/useTrendLines'
import { AssetSearch } from '../AssetSearch'
import { CrosshairOverlay } from './CrosshairOverlay'

import type { OrderLine, TradingChartHandle, TradingChartProps } from './types'

export const TradingChart = forwardRef<TradingChartHandle, TradingChartProps>(
    function TradingChart(
        {
            symbol = 'BTCUSDT',
            interval = '1h',
            limit = 100,
            orders = [],
            orderHistory = [],
            currentPrice = 0,
            isInWatchlist = false,
            onAddToWatchlist,
            onAssetSelect,
            onIntervalChange,
        },
        ref
    ) {
        // Chart lifecycle management
        const {
            chartContainerRef,
            chartRef,
            candlestickSeriesRef,
            ema20SeriesRef,
            orderHistorySeriesRef,
            trendLineSeriesRef,
            priceLinesRef,
            previewLineRef,
            chartInitializedRef,
        } = useChartInstance({ symbol, interval, limit })

        // Data fetching and transformation
        const { klinesData, ema20Data, refetchKlines } = useChartData({
            symbol,
            interval,
            limit,
            candlestickSeriesRef,
            ema20SeriesRef,
            chartRef,
            chartInitializedRef,
        })

        // Trend lines detection and rendering
        useTrendLines({
            klinesData,
            ema20Data,
            chartRef,
            trendLineSeriesRef,
        })

        // Order lines management
        const { addOrderLine, removeOrderLine } = useOrderLines({
            orders,
            symbol,
            candlestickSeriesRef,
            priceLinesRef,
        })

        // Order history visualization
        useOrderHistorySeries({
            orderHistory,
            interval,
            klinesData,
            chartRef,
            orderHistorySeriesRef,
        })

        // Preview line for drag operations
        const { showPreviewLine, hidePreviewLine } = usePreviewLine({
            currentPrice,
            candlestickSeriesRef,
            previewLineRef,
        })

        // Crosshair info for variation display
        const crosshairInfo = useCrosshairInfo({
            chartRef,
            candlestickSeriesRef,
            lastPrice: currentPrice,
        })

        // Drag-and-drop setup
        const { setNodeRef, isOver } = useDroppable({
            id: 'trading-chart-drop-zone',
        })

        // Combine refs for the chart container
        const setRefs = useCallback(
            (node: HTMLDivElement | null) => {
                chartContainerRef.current = node
                setNodeRef(node)
            },
            [setNodeRef, chartContainerRef]
        )

        // Expose imperative handle to parent
        useImperativeHandle(
            ref,
            () => ({
                getPriceAtY: (y: number): number | null => {
                    if (!candlestickSeriesRef.current || !chartContainerRef.current) return null
                    const rect = chartContainerRef.current.getBoundingClientRect()
                    const relativeY = y - rect.top
                    return candlestickSeriesRef.current.coordinateToPrice(relativeY)
                },
                getChartRect: (): DOMRect | null => {
                    return chartContainerRef.current?.getBoundingClientRect() ?? null
                },
                addOrderLine: (order: OrderLine) => addOrderLine(order),
                removeOrderLine: (orderId: string) => removeOrderLine(orderId),
                showPreviewLine,
                hidePreviewLine,
            }),
            [
                chartContainerRef,
                candlestickSeriesRef,
                addOrderLine,
                removeOrderLine,
                showPreviewLine,
                hidePreviewLine,
            ]
        )

        return (
            <Card className={isOver ? 'ring-2 ring-yellow-500' : ''}>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="w-6 h-6 text-primary" />
                        {symbol} Chart
                        <div className="flex ml-2">
                            <Button
                                variant={interval === '1h' ? 'default' : 'ghost'}
                                size="sm"
                                className="rounded-r-none px-2 h-7 text-xs"
                                onClick={() => onIntervalChange?.('1h')}
                            >
                                1H
                            </Button>
                            <Button
                                variant={interval === '1d' ? 'default' : 'ghost'}
                                size="sm"
                                className="rounded-l-none px-2 h-7 text-xs"
                                onClick={() => onIntervalChange?.('1d')}
                            >
                                1D
                            </Button>
                        </div>
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        {onAssetSelect && (
                            <AssetSearch onSelect={onAssetSelect} currentSymbol={symbol} />
                        )}
                        {onAddToWatchlist && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="rounded-full"
                                onClick={onAddToWatchlist}
                                disabled={isInWatchlist}
                                title={isInWatchlist ? 'Already in watchlist' : 'Add to watchlist'}
                            >
                                {isInWatchlist ? (
                                    <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                                ) : (
                                    <StarOff className="w-4 h-4" />
                                )}
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-full"
                            onClick={refetchKlines}
                        >
                            <RefreshCw className="w-4 h-4" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="relative">
                    <div
                        ref={setRefs}
                        className={`w-full transition-all ${isOver ? 'opacity-90' : ''}`}
                    />
                    <CrosshairOverlay crosshairInfo={crosshairInfo} />
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
