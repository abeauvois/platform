/**
 * Hook for managing order mode state
 *
 * Order modes:
 * - 'stop_limit': Default mode - drag creates stop-limit orders, click opens stop-market modal
 * - 'limit': Traditional mode - drag creates limit orders, click does nothing
 */

import { useState } from 'react'

export type OrderMode = 'limit' | 'stop_limit'

export interface UseOrderModeReturn {
  /** Current order mode */
  orderMode: OrderMode
  /** Set the order mode */
  setOrderMode: (mode: OrderMode) => void
  /** Convenience check for stop mode */
  isStopMode: boolean
}

/**
 * Hook to manage order mode state (stop-limit vs limit)
 * Default mode is 'stop_limit' for intuitive drag-to-place-stop behavior
 */
export function useOrderMode(): UseOrderModeReturn {
  const [orderMode, setOrderMode] = useState<OrderMode>('stop_limit')

  return {
    orderMode,
    setOrderMode,
    isStopMode: orderMode === 'stop_limit',
  }
}
