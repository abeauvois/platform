import { useEffect, useState } from 'react'

/**
 * Hook to sync current price from prices map
 *
 * Note: Binance prices are stored with USDT suffix (e.g., BTCUSDT)
 */
export function useCurrentPrice(baseAsset: string, prices: Map<string, number>): number {
  const [currentPrice, setCurrentPrice] = useState(0)

  useEffect(() => {
    const priceKey = `${baseAsset}USDT`
    const price = prices.get(priceKey)
    if (price) {
      setCurrentPrice(price)
    }
  }, [prices, baseAsset])

  return currentPrice
}
