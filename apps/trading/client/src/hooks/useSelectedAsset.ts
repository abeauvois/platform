import { useCallback, useState } from 'react'

// Default quote asset for trading pairs (USDC for EU compliance)
const DEFAULT_QUOTE_ASSET = 'USDC'
const DEFAULT_BASE_ASSET = 'BTC'

/**
 * Source of asset selection
 */
export type AssetSource = 'spot' | 'margin'

/**
 * Strip "LD" prefix from symbols (e.g., "LDBANANAS31" -> "BANANAS31")
 * Binance uses LD prefix for flexible savings tokens
 */
export function normalizeAsset(asset: string): string {
  return asset.startsWith('LD') ? asset.slice(2) : asset
}

export interface UseSelectedAssetParams {
  /** Callback when asset source changes (for syncing account mode) */
  onSourceChange?: (source: AssetSource) => void
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
  /** Source of last asset selection (spot or margin balance card) */
  assetSource: AssetSource | null
  /** Handler for asset selection with source tracking */
  handleAssetSelect: (asset: string, source?: AssetSource) => void
}

/**
 * Hook to manage selected trading asset and derived trading configuration
 * @param params - Optional parameters including source change callback
 */
export function useSelectedAsset(params?: UseSelectedAssetParams): UseSelectedAssetReturn {
  const [selectedAsset, setSelectedAsset] = useState(DEFAULT_BASE_ASSET)
  const [assetSource, setAssetSource] = useState<AssetSource | null>(null)

  // Normalize asset to strip "LD" prefix
  const baseAsset = normalizeAsset(selectedAsset)
  const quoteAsset = DEFAULT_QUOTE_ASSET
  const tradingSymbol = `${baseAsset}${quoteAsset}`

  // Handle asset selection from balance list (filter out quote asset)
  const handleAssetSelect = useCallback(
    (asset: string, source?: AssetSource) => {
      if (asset === quoteAsset) {
        return
      }
      setSelectedAsset(asset)
      if (source) {
        setAssetSource(source)
        params?.onSourceChange?.(source)
      }
    },
    [quoteAsset, params]
  )

  return {
    selectedAsset,
    setSelectedAsset,
    baseAsset,
    quoteAsset,
    tradingSymbol,
    assetSource,
    handleAssetSelect,
  }
}
