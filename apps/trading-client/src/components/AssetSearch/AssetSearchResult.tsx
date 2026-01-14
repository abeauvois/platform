import type { SymbolSearchResult } from '../../lib/api'
import { formatPrice } from '../../utils/balance'

interface AssetSearchResultProps {
  symbol: SymbolSearchResult
  isSelected: boolean
  onSelect: () => void
}

export function AssetSearchResult({ symbol, isSelected, onSelect }: AssetSearchResultProps) {
  const isPositive = symbol.priceChangePercent24h >= 0

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full px-3 py-2 flex items-center justify-between hover:bg-accent transition-colors ${
        isSelected ? 'bg-accent' : ''
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="font-medium">{symbol.baseAsset}</span>
        <span className="text-xs text-muted-foreground">/USDC</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm">{formatPrice(symbol.price)}</span>
        <span
          className={`text-xs min-w-[50px] text-right ${
            isPositive ? 'text-green-500' : 'text-red-500'
          }`}
        >
          {isPositive ? '+' : ''}
          {symbol.priceChangePercent24h.toFixed(2)}%
        </span>
      </div>
    </button>
  )
}
