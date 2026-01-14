/**
 * Stop Price Modal
 *
 * Modal dialog for entering stop price when clicking BUY/SELL buttons
 * in stop-limit mode. Creates stop-market orders.
 */

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Button,
  Label,
} from '@platform/ui'
import { detectStopOrderCategory } from '@platform/trading-domain'
import { formatPrice } from '../utils/balance'

export interface StopPriceModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Order side (buy or sell) */
  side: 'buy' | 'sell'
  /** Current market price */
  currentPrice: number
  /** Order quantity */
  quantity: number
  /** Base asset symbol (e.g., 'BTC') */
  baseAsset: string
  /** Callback when user confirms the order */
  onConfirm: (stopPrice: number) => void
  /** Callback when user cancels */
  onCancel: () => void
}

export function StopPriceModal({
  isOpen,
  side,
  currentPrice,
  quantity,
  baseAsset,
  onConfirm,
  onCancel,
}: StopPriceModalProps) {
  const [stopPriceInput, setStopPriceInput] = useState('')

  const stopPrice = parseFloat(stopPriceInput)
  const isValidPrice = !isNaN(stopPrice) && stopPrice > 0

  // Detect the order type based on stop price position
  const detectedType = isValidPrice
    ? detectStopOrderCategory(side, stopPrice, currentPrice)
    : null

  // Calculate order value
  const orderValue = isValidPrice ? quantity * stopPrice : 0

  const handleConfirm = () => {
    if (isValidPrice) {
      onConfirm(stopPrice)
      setStopPriceInput('') // Reset for next use
    }
  }

  const handleClose = () => {
    setStopPriceInput('')
    onCancel()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className={side === 'buy' ? 'text-green-500' : 'text-red-500'}>
            Stop-Market {side.toUpperCase()} Order
          </DialogTitle>
          <DialogDescription>
            Enter the stop price to trigger a market {side} order for {quantity} {baseAsset}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Current Price Display */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Current Price:</span>
            <span className="font-medium">{formatPrice(currentPrice)}</span>
          </div>

          {/* Stop Price Input */}
          <div className="grid gap-2">
            <Label htmlFor="stop-price">Stop Price (USD)</Label>
            <Input
              id="stop-price"
              type="number"
              placeholder={`e.g., ${(side === 'buy' ? currentPrice * 1.02 : currentPrice * 0.98).toFixed(2)}`}
              value={stopPriceInput}
              onChange={(e) => setStopPriceInput(e.target.value)}
              step="0.01"
              min="0"
              autoFocus
            />
          </div>

          {/* Order Type Detection */}
          {detectedType && (
            <div className={`text-sm p-2 rounded-md ${
              detectedType === 'stop_loss'
                ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                : 'bg-green-500/10 text-green-400 border border-green-500/20'
            }`}>
              <span className="font-medium">
                {detectedType === 'stop_loss' ? 'STOP LOSS' : 'TAKE PROFIT'}
              </span>
              <span className="text-muted-foreground ml-2">
                {side === 'buy'
                  ? detectedType === 'stop_loss'
                    ? '(triggers when price rises to stop)'
                    : '(triggers when price drops to stop)'
                  : detectedType === 'stop_loss'
                    ? '(triggers when price drops to stop)'
                    : '(triggers when price rises to stop)'
                }
              </span>
            </div>
          )}

          {/* Order Summary */}
          {isValidPrice && (
            <div className="flex items-center justify-between text-sm border-t pt-4">
              <span className="text-muted-foreground">Order Value:</span>
              <span className="font-medium">{formatPrice(orderValue)}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!isValidPrice}
            className={side === 'buy'
              ? 'bg-green-500 hover:bg-green-600'
              : 'bg-red-500 hover:bg-red-600'
            }
          >
            Place {side.toUpperCase()} Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
