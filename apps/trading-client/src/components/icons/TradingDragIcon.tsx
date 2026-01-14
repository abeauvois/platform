import type { SVGProps } from 'react'

interface TradingDragIconProps extends SVGProps<SVGSVGElement> {
  size?: number | string
}

/**
 * Minimalist abstract icon combining trading chart and drag-drop concepts.
 * Uses currentColor for theme compatibility.
 */
export function TradingDragIcon({
  size = 24,
  className,
  ...props
}: TradingDragIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Horizontal line being dragged */}
      <line x1="2" y1="12" x2="22" y2="12" strokeWidth="2" />

      {/* Vertical drag arrow (up and down) */}
      <path d="M12 5l-3 3h6l-3-3z" fill="currentColor" stroke="none" />
      <path d="M12 19l-3-3h6l-3 3z" fill="currentColor" stroke="none" />
    </svg>
  )
}

export default TradingDragIcon
