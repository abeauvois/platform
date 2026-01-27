import { Search, Loader2 } from 'lucide-react'
import { Input } from '@abeauvois/platform-ui'
import { useRef, useEffect } from 'react'
import { useSymbolSearch } from '../../hooks/queries/useSymbolSearch'
import { AssetSearchResult } from './AssetSearchResult'

interface AssetSearchProps {
  onSelect: (baseAsset: string) => void
  currentSymbol: string
}

export function AssetSearch({ onSelect, currentSymbol }: AssetSearchProps) {
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { searchQuery, setSearchQuery, isOpen, setIsOpen, close, filteredSymbols, isLoading } =
    useSymbolSearch()

  useEffect(() => {
    if (!isOpen) return

    const handleEvent = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent && e.key === 'Escape') {
        close()
      } else if (e instanceof MouseEvent && !dropdownRef.current?.contains(e.target as Node)) {
        close()
      }
    }

    document.addEventListener('mousedown', handleEvent)
    document.addEventListener('keydown', handleEvent)
    return () => {
      document.removeEventListener('mousedown', handleEvent)
      document.removeEventListener('keydown', handleEvent)
    }
  }, [isOpen, close])

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          className="pl-8 w-36 h-8 text-sm"
        />
      </div>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1 w-72 bg-card border rounded-md shadow-lg z-50 max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 flex items-center justify-center text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Loading...
            </div>
          ) : filteredSymbols.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">No results</div>
          ) : (
            filteredSymbols.map((symbol) => (
              <AssetSearchResult
                key={symbol.symbol}
                symbol={symbol}
                isSelected={symbol.symbol === currentSymbol}
                onSelect={() => {
                  onSelect(symbol.baseAsset)
                  close()
                }}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}
