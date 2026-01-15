import { useEffect, useRef, useState } from 'react'

// Default percentage of available balance for order amounts
const DEFAULT_BALANCE_PERCENTAGE = 0.33

export interface UseOrderAmountsReturn {
  buyAmount: number
  sellAmount: number
  setBuyAmount: (amount: number) => void
  setSellAmount: (amount: number) => void
}

/**
 * Hook to manage buy/sell order amounts with auto-calculated defaults
 *
 * Default calculation: 33% of available balance (in volume)
 * - Buy: 33% of (quoteBalance / currentPrice)
 * - Sell: 33% of baseBalance
 *
 * Amounts are only auto-calculated on:
 * - Initial load (when transitioning from 0 to valid price)
 * - Symbol change (user selects a different trading pair)
 *
 * After initialization, user changes are preserved and not overwritten by data syncs.
 */
export function useOrderAmounts(
  currentPrice: number,
  baseBalance: number,
  quoteBalance: number,
  symbol?: string,
  priceAsset?: string
): UseOrderAmountsReturn {
  const [buyAmount, setBuyAmount] = useState(0)
  const [sellAmount, setSellAmount] = useState(0)

  // Track the symbol we last calculated for
  const calculatedForSymbolRef = useRef<string | undefined>(undefined)

  // Calculate default amounts when symbol changes and we have valid price
  useEffect(() => {
    // Skip if no symbol
    if (!symbol) return

    // Extract base asset from symbol (e.g., "BTCUSDC" -> "BTC")
    const symbolBaseAsset = symbol.replace(/USD[CT]$/, '')

    // Only calculate if:
    // 1. We haven't calculated for this symbol yet
    // 2. Price is valid (> 0)
    // 3. Price is for the correct asset (priceAsset matches symbol's base asset)
    const needsCalculation = symbol !== calculatedForSymbolRef.current
    const priceIsValid = currentPrice > 0
    const priceMatchesSymbol = !priceAsset || priceAsset === symbolBaseAsset

    if (needsCalculation) {
      if (!priceIsValid || !priceMatchesSymbol) {
        // Reset amounts while waiting for correct price
        setBuyAmount(0)
        setSellAmount(0)
        return
      }

      // Price is valid and matches symbol - calculate defaults
      // For BUY: 33% of available volume (quoteBalance / price)
      const availableBuyVolume = quoteBalance / currentPrice
      const defaultBuy = availableBuyVolume * DEFAULT_BALANCE_PERCENTAGE
      setBuyAmount(defaultBuy > 0 ? Math.floor(defaultBuy * 10000) / 10000 : 0)

      // For SELL: 33% of base balance
      const defaultSell = baseBalance * DEFAULT_BALANCE_PERCENTAGE
      setSellAmount(defaultSell > 0 ? Math.floor(defaultSell * 10000) / 10000 : 0)

      // Mark this symbol as calculated
      calculatedForSymbolRef.current = symbol
    }
  }, [baseBalance, quoteBalance, currentPrice, symbol, priceAsset])

  return {
    buyAmount,
    sellAmount,
    setBuyAmount,
    setSellAmount,
  }
}
