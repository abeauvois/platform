import { useEffect, useState } from 'react'

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
 */
export function useOrderAmounts(
  currentPrice: number,
  baseBalance: number,
  quoteBalance: number
): UseOrderAmountsReturn {
  const [buyAmount, setBuyAmount] = useState(0)
  const [sellAmount, setSellAmount] = useState(0)

  // Calculate default amounts when price or balances change
  useEffect(() => {
    if (currentPrice > 0) {
      // For BUY: use quote balance (USDC) to calculate max buy amount
      const maxBuyByValue = MAX_ORDER_VALUE_USD / currentPrice
      const maxBuyByBalance = quoteBalance / currentPrice
      const defaultBuy = Math.min(maxBuyByValue, maxBuyByBalance * 0.25)
      setBuyAmount(defaultBuy > 0 ? Math.floor(defaultBuy * 10000) / 10000 : 0)

      // For SELL: use base balance to calculate max sell amount
      const maxSellByValue = MAX_ORDER_VALUE_USD / currentPrice
      const defaultSell = Math.min(maxSellByValue, baseBalance * 0.25)
      setSellAmount(defaultSell > 0 ? Math.floor(defaultSell * 10000) / 10000 : 0)
    } else {
      setBuyAmount(0)
      setSellAmount(0)
    }
  }, [baseBalance, quoteBalance, currentPrice])

  return {
    buyAmount,
    sellAmount,
    setBuyAmount,
    setSellAmount,
  }
}
