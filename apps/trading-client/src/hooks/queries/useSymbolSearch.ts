import { useQuery } from '@tanstack/react-query'
import { useState, useMemo } from 'react'
import { tradingKeys } from '../../lib/query-keys'
import { fetchSymbols, type SymbolSearchResult } from '../../lib/api'

const QUOTE_ASSET = 'USDC'

export function useSymbolSearch() {
  const [searchQuery, setSearchQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  const { data: symbols = [], isLoading } = useQuery<Array<SymbolSearchResult>>({
    queryKey: tradingKeys.symbolsByQuoteAsset(QUOTE_ASSET),
    queryFn: () => fetchSymbols({ quoteAsset: QUOTE_ASSET, withPrices: true }),
    staleTime: 60 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
    enabled: isOpen,
  })

  const filteredSymbols = useMemo(() => {
    const query = searchQuery.trim().toUpperCase()
    const filtered = query
      ? symbols.filter((s) => s.baseAsset.includes(query) || s.symbol.includes(query))
      : symbols
    return filtered.slice(0, 20)
  }, [symbols, searchQuery])

  const close = () => {
    setIsOpen(false)
    setSearchQuery('')
  }

  return { searchQuery, setSearchQuery, isOpen, setIsOpen, close, filteredSymbols, isLoading }
}
