import { Button } from '@platform/ui'
import { useDraggable } from '@dnd-kit/core'
import { ArrowDownWideNarrow, ArrowUpNarrowWide, Star, Calendar } from 'lucide-react'
import { useMemo, useState } from 'react'

import { TradingCard, TradingCardLoader } from './TradingCard'
import { WatchlistItem } from './WatchlistItem'
import { SET_REFERENCE_DRAG_ID } from '../hooks/useDragReferenceDate'

import type { WatchlistItemResponse } from '../lib/api'

type SortOrder = 'desc' | 'asc'
type SortField = '24h' | 'ref'

export interface WatchlistCardProps {
  watchlist: Array<WatchlistItemResponse>
  isLoading: boolean
  error: Error | null
  refetch: () => void
  selectedSymbol?: string
  onSymbolSelect: (symbol: string) => void
  onRemoveSymbol: (symbol: string) => void
  /** Callback to clear the global reference timestamp (applies to all items) */
  onClearReference?: () => void
}

export function WatchlistCard({
  watchlist,
  isLoading,
  error,
  refetch,
  selectedSymbol,
  onSymbolSelect,
  onRemoveSymbol,
  onClearReference,
}: Readonly<WatchlistCardProps>) {
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [sortField, setSortField] = useState<SortField>('24h')

  // Set up draggable for the Set Reference button
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: SET_REFERENCE_DRAG_ID,
  })

  const sortedWatchlist = useMemo(() => {
    return [...watchlist].sort((a, b) => {
      let aChange: number
      let bChange: number

      if (sortField === 'ref') {
        aChange = a.referencePriceChangePercent ?? 0
        bChange = b.referencePriceChangePercent ?? 0
      } else {
        aChange = a.priceChangePercent24h ?? 0
        bChange = b.priceChangePercent24h ?? 0
      }

      return sortOrder === 'desc' ? bChange - aChange : aChange - bChange
    })
  }, [watchlist, sortOrder, sortField])

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))
  }

  const headerActions = (
    <div className="flex items-center gap-1">
      {/* Set Reference draggable button */}
      <button
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        type="button"
        className={`h-7 px-2 rounded-lg flex items-center gap-1 text-xs font-medium transition-all cursor-grab active:cursor-grabbing ${
          isDragging
            ? 'bg-blue-500/30 text-blue-400 shadow-lg'
            : 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'
        }`}
        title="Drag to chart to set reference date"
      >
        <Calendar className="w-3 h-3" />
        <span>Ref</span>
      </button>

      {/* Sort field segmented control */}
      <div className="flex rounded-lg bg-muted/50">
        <button
          type="button"
          onClick={() => setSortField('24h')}
          className={`px-2 h-7 text-xs font-medium rounded-l-lg transition-colors ${
            sortField === '24h'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          24h
        </button>
        <button
          type="button"
          onClick={() => setSortField('ref')}
          className={`px-2 h-7 text-xs font-medium rounded-r-lg transition-colors ${
            sortField === 'ref'
              ? 'bg-blue-500 text-white'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Ref
        </button>
      </div>

      {/* Sort order toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 rounded-full"
        onClick={toggleSortOrder}
        title={sortOrder === 'desc' ? `Sorted by ${sortField === 'ref' ? 'ref' : '24h'} change (highest first)` : `Sorted by ${sortField === 'ref' ? 'ref' : '24h'} change (lowest first)`}
      >
        {sortOrder === 'desc' ? (
          <ArrowDownWideNarrow className="w-4 h-4" />
        ) : (
          <ArrowUpNarrowWide className="w-4 h-4" />
        )}
      </Button>
    </div>
  )

  return (
    <TradingCard
      title="Watchlist"
      icon={<Star className="w-5 h-5" />}
      iconColor="text-yellow-500"
      isLoading={isLoading}
      error={error}
      onRefresh={refetch}
      scrollable
      headerActions={headerActions}
    >
      {isLoading && watchlist.length === 0 ? (
        <TradingCardLoader color="text-yellow-500" />
      ) : (
        <div className="space-y-2">
          {sortedWatchlist.length === 0 ? (
            <div className="text-center py-4 text-sm text-muted-foreground">
              <Star className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
              <p>No symbols in watchlist</p>
              <p className="text-xs mt-1">Click the star on the chart to add symbols</p>
            </div>
          ) : (
            sortedWatchlist.map((item) => (
              <WatchlistItem
                key={item.symbol}
                symbol={item.symbol}
                price={item.price}
                priceChangePercent={item.priceChangePercent24h}
                referenceTimestamp={item.referenceTimestamp}
                referencePriceChangePercent={item.referencePriceChangePercent}
                isLoading={isLoading}
                isSelected={selectedSymbol === item.symbol}
                onSelect={onSymbolSelect}
                onRemove={onRemoveSymbol}
                onClearReference={onClearReference}
              />
            ))
          )}
        </div>
      )}
    </TradingCard>
  )
}
