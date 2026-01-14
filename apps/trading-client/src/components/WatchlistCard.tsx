import { Button } from '@platform/ui'
import { ArrowDownWideNarrow, ArrowUpNarrowWide, Star } from 'lucide-react'
import { useMemo, useState } from 'react'

import { TradingCard, TradingCardLoader } from './TradingCard'
import { WatchlistItem } from './WatchlistItem'

import type { WatchlistItemResponse } from '../lib/api'

type SortOrder = 'desc' | 'asc'

export interface WatchlistCardProps {
  watchlist: Array<WatchlistItemResponse>
  isLoading: boolean
  error: Error | null
  refetch: () => void
  selectedSymbol?: string
  onSymbolSelect: (symbol: string) => void
  onRemoveSymbol: (symbol: string) => void
}

export function WatchlistCard({
  watchlist,
  isLoading,
  error,
  refetch,
  selectedSymbol,
  onSymbolSelect,
  onRemoveSymbol,
}: Readonly<WatchlistCardProps>) {
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  const sortedWatchlist = useMemo(() => {
    return [...watchlist].sort((a, b) => {
      const aChange = a.priceChangePercent24h ?? 0
      const bChange = b.priceChangePercent24h ?? 0
      return sortOrder === 'desc' ? bChange - aChange : aChange - bChange
    })
  }, [watchlist, sortOrder])

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))
  }

  const sortButton = (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 rounded-full"
      onClick={toggleSortOrder}
      title={sortOrder === 'desc' ? 'Sorted by 24h change (highest first)' : 'Sorted by 24h change (lowest first)'}
    >
      {sortOrder === 'desc' ? (
        <ArrowDownWideNarrow className="w-4 h-4" />
      ) : (
        <ArrowUpNarrowWide className="w-4 h-4" />
      )}
    </Button>
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
      headerActions={sortButton}
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
                isLoading={isLoading}
                isSelected={selectedSymbol === item.symbol}
                onSelect={onSymbolSelect}
                onRemove={onRemoveSymbol}
              />
            ))
          )}
        </div>
      )}
    </TradingCard>
  )
}
