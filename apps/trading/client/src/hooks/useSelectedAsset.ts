import { useCallback, useState } from 'react'

// Default quote asset for trading pairs (USDC for EU compliance)
const DEFAULT_QUOTE_ASSET = 'USDC'
const DEFAULT_BASE_ASSET = 'BTC'

/**
 * Strip "LD" prefix from symbols (e.g., "LDBANANAS31" -> "BANANAS31")
 * Binance uses LD prefix for flexible savings tokens
 */
export function normalizeAsset(asset: string): string {
  return asset.startsWith('LD') ? asset.slice(2) : asset
}

export interface UseSelectedAssetReturn {
  /** Raw selected asset (may have LD prefix) */
  selectedAsset: string
  /** Set selected asset directly */
  setSelectedAsset: (asset: string) => void
  /** Normalized base asset (LD prefix stripped) */
  baseAsset: string
  /** Quote asset (USDC) */
  quoteAsset: string
  /** Trading symbol (e.g., BTCUSDC) */
  tradingSymbol: string
  /** Handler for asset selection (filters out quote asset) */
  handleAssetSelect: (asset: string) => void
}

/**
 * Hook to manage selected trading asset and derived trading configuration
 */
export function useSelectedAsset(): UseSelectedAssetReturn {
  const [selectedAsset, setSelectedAsset] = useState(DEFAULT_BASE_ASSET)

  // Normalize asset to strip "LD" prefix
  const baseAsset = normalizeAsset(selectedAsset)
  const quoteAsset = DEFAULT_QUOTE_ASSET
  const tradingSymbol = `${baseAsset}${quoteAsset}`

  // Handle asset selection from balance list (filter out quote asset)
  const handleAssetSelect = useCallback(
    (asset: string) => {
      if (asset === quoteAsset) {
        return
      }
      setSelectedAsset(asset)
    },
    [quoteAsset]
  )

  return {
    selectedAsset,
    setSelectedAsset,
    baseAsset,
    quoteAsset,
    tradingSymbol,
    handleAssetSelect,
  }
}
