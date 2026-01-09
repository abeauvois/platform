import { useEffect, useRef, useState } from 'react'

// Maximum order value in USD
const MAX_ORDER_VALUE_USD = 500

export interface UseOrderAmountsReturn {
  buyAmount: number
  sellAmount: number
  setBuyAmount: (amount: number) => void
  setSellAmount: (amount: number) => void
}

/**
 * Hook to manage buy/sell order amounts with auto-calculated defaults
 *
 * Default calculation: min($500 worth / price, 25% of available balance)
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
  symbol?: string
): UseOrderAmountsReturn {
  const [buyAmount, setBuyAmount] = useState(0)
  const [sellAmount, setSellAmount] = useState(0)

  // Track the last symbol we initialized for (to reset on symbol change)
  const lastSymbolRef = useRef<string | undefined>(undefined)

  // Calculate default amounts only on initial load or symbol change
  useEffect(() => {
    // Check if symbol changed (need to recalculate defaults)
    const symbolChanged = symbol !== undefined && symbol !== lastSymbolRef.current

    // Only initialize when we first get valid data or when symbol changes
    if (currentPrice > 0 && (lastSymbolRef.current === undefined || symbolChanged)) {
      // For BUY: use quote balance (USDC) to calculate max buy amount
      const maxBuyByValue = MAX_ORDER_VALUE_USD / currentPrice
      const maxBuyByBalance = quoteBalance / currentPrice
      const defaultBuy = Math.min(maxBuyByValue, maxBuyByBalance * 0.25)
      setBuyAmount(defaultBuy > 0 ? Math.floor(defaultBuy * 10000) / 10000 : 0)

      // For SELL: use base balance to calculate max sell amount
      const maxSellByValue = MAX_ORDER_VALUE_USD / currentPrice
      const defaultSell = Math.min(maxSellByValue, baseBalance * 0.25)
      setSellAmount(defaultSell > 0 ? Math.floor(defaultSell * 10000) / 10000 : 0)

      lastSymbolRef.current = symbol
    }
  }, [baseBalance, quoteBalance, currentPrice, symbol])

  return {
    buyAmount,
    sellAmount,
    setBuyAmount,
    setSellAmount,
  }
}
