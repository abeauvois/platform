import { Star } from 'lucide-react'

import { TradingCard, TradingCardLoader } from './TradingCard'
import { WatchlistItem } from './WatchlistItem'

import type { WatchlistItemResponse } from '../lib/api'

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
  return (
    <TradingCard
      title="Watchlist"
      icon={<Star className="w-5 h-5" />}
      iconColor="text-yellow-500"
      isLoading={isLoading}
      error={error}
      onRefresh={refetch}
      scrollable
    >
      {isLoading && watchlist.length === 0 ? (
        <TradingCardLoader color="text-yellow-500" />
      ) : (
        <div className="space-y-2">
          {watchlist.length === 0 ? (
            <div className="text-center py-4 text-sm text-muted-foreground">
              <Star className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
              <p>No symbols in watchlist</p>
              <p className="text-xs mt-1">Click the star on the chart to add symbols</p>
            </div>
          ) : (
            watchlist.map((item) => (
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
