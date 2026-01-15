import { useEffect, useRef, useState } from 'react'

export interface CurrentPriceResult {
  price: number
  asset: string
}

/**
 * Hook to sync current price from prices map
 *
 * Note: Binance prices are stored with USDT suffix (e.g., BTCUSDT)
 * Returns both the price and the asset it's for, so consumers can verify
 * the price matches their expected asset (prevents race conditions).
 */
export function useCurrentPrice(baseAsset: string, prices: Map<string, number>): CurrentPriceResult {
  const [currentPrice, setCurrentPrice] = useState(0)
  const [priceAsset, setPriceAsset] = useState(baseAsset)
  const lastAssetRef = useRef<string>(baseAsset)

  useEffect(() => {
    // Reset price when asset changes
    if (baseAsset !== lastAssetRef.current) {
      setCurrentPrice(0)
      setPriceAsset(baseAsset)
      lastAssetRef.current = baseAsset
    }

    const priceKey = `${baseAsset}USDT`
    const price = prices.get(priceKey)
    if (price) {
      setCurrentPrice(price)
      setPriceAsset(baseAsset)
    }
  }, [prices, baseAsset])

  return { price: currentPrice, asset: priceAsset }
}
