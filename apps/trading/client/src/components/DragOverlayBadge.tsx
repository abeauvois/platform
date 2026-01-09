interface DragOverlayBadgeProps {
  side: 'buy' | 'sell'
}

/**
 * Visual feedback badge shown during drag-and-drop order placement
 */
export function DragOverlayBadge({ side }: Readonly<DragOverlayBadgeProps>) {
  return (
    <div
      className={`px-8 py-6 rounded-lg text-xl font-bold text-white shadow-2xl ${
        side === 'buy' ? 'bg-green-500' : 'bg-red-500'
      }`}
    >
      {side === 'buy' ? 'BUY' : 'SELL'}
    </div>
  )
}
