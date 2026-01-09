import { Button, Card, CardContent, Input } from '@platform/ui'
import { ChevronDown, ChevronUp, CirclePlus, Info } from 'lucide-react'
import { useState } from 'react'

type MarketType = 'spot' | 'cross' | 'isolated'
type OrderType = 'limit' | 'market' | 'stop-limit'

interface OrderFormProps {
  side: 'buy' | 'sell'
  baseAsset: string
  quoteAsset: string
  currentPrice: number
  availableBalance: number
  availableAsset: string
}

function OrderForm({
  side,
  baseAsset,
  quoteAsset,
  currentPrice,
  availableBalance,
  availableAsset,
}: Readonly<OrderFormProps>) {
  const [price, setPrice] = useState(currentPrice.toString())
  const [amount, setAmount] = useState('')
  const [sliderValue, setSliderValue] = useState(0)
  const [tpslEnabled, setTpslEnabled] = useState(false)

  const isBuy = side === 'buy'
  const total = Number(price) * Number(amount) || 0

  const handleSliderChange = (value: number) => {
    setSliderValue(value)
    if (availableBalance > 0) {
      if (isBuy) {
        const maxAmount = (availableBalance * value) / 100 / Number(price)
        setAmount(maxAmount > 0 ? maxAmount.toFixed(6) : '')
      } else {
        const maxAmount = (availableBalance * value) / 100
        setAmount(maxAmount > 0 ? maxAmount.toFixed(6) : '')
      }
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Normal/Borrow/Repay tabs */}
      <div className="flex items-center gap-3 text-xs">
        <button type="button" className="px-2 py-1 border border-muted-foreground/30 rounded text-foreground">
          Normal
        </button>
        <button type="button" className="text-muted-foreground hover:text-foreground">
          Borrow
        </button>
        <button type="button" className="text-muted-foreground hover:text-foreground">
          Repay
        </button>
        <Info className="w-3.5 h-3.5 text-muted-foreground" />
      </div>

      {/* Price input */}
      <div className="relative">
        <div className="flex items-center bg-input/20 dark:bg-input/30 border border-input rounded-md px-3 py-2">
          <span className="text-muted-foreground text-xs w-12">Price</span>
          <Input
            type="text"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="flex-1 bg-transparent border-0 text-right text-sm font-medium p-0 h-auto focus-visible:ring-0"
          />
          <span className="text-muted-foreground text-xs ml-2">{quoteAsset}</span>
        </div>
        <div className="absolute right-8 top-1/2 -translate-y-1/2 flex flex-col gap-0">
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground p-0.5"
            onClick={() => setPrice((Number(price) + 0.000001).toFixed(6))}
          >
            <ChevronUp className="w-3 h-3" />
          </button>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground p-0.5"
            onClick={() => setPrice(Math.max(0, Number(price) - 0.000001).toFixed(6))}
          >
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Amount input */}
      <div className="relative">
        <div className="flex items-center bg-input/20 dark:bg-input/30 border border-input rounded-md px-3 py-2">
          <span className="text-muted-foreground text-xs w-12">Amount</span>
          <Input
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder=""
            className="flex-1 bg-transparent border-0 text-right text-sm font-medium p-0 h-auto focus-visible:ring-0"
          />
          <span className="text-muted-foreground text-xs ml-2">{baseAsset}</span>
        </div>
        <div className="absolute right-12 top-1/2 -translate-y-1/2 flex flex-col gap-0">
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground p-0.5"
            onClick={() => setAmount((Number(amount) + 1).toString())}
          >
            <ChevronUp className="w-3 h-3" />
          </button>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground p-0.5"
            onClick={() => setAmount(Math.max(0, Number(amount) - 1).toString())}
          >
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Percentage slider */}
      <div className="flex items-center gap-2 py-1">
        <button
          type="button"
          className={`w-3 h-3 rotate-45 border ${sliderValue === 0 ? 'border-foreground bg-foreground' : 'border-muted-foreground/50'}`}
          onClick={() => handleSliderChange(0)}
        />
        <div className="flex-1 relative h-0.5 bg-muted-foreground/30">
          <div
            className="absolute h-full bg-muted-foreground/50"
            style={{ width: `${sliderValue}%` }}
          />
        </div>
        {[25, 50, 75, 100].map((pct) => (
          <button
            key={pct}
            type="button"
            className={`w-3 h-3 rotate-45 border ${sliderValue >= pct ? 'border-foreground bg-foreground' : 'border-muted-foreground/50'}`}
            onClick={() => handleSliderChange(pct)}
          />
        ))}
      </div>

      {/* Total */}
      <div className="flex items-center bg-input/20 dark:bg-input/30 border border-input rounded-md px-3 py-2">
        <span className="text-muted-foreground text-xs w-12">Total</span>
        <span className="flex-1 text-right text-sm text-muted-foreground">
          {total > 0 ? total.toFixed(2) : 'Minimum 1'}
        </span>
        <span className="text-muted-foreground text-xs ml-2">{quoteAsset}</span>
      </div>

      {/* TP/SL checkbox */}
      <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
        <input
          type="checkbox"
          checked={tpslEnabled}
          onChange={(e) => setTpslEnabled(e.target.checked)}
          className="w-4 h-4 rounded border-muted-foreground/30"
        />
        TP/SL
      </label>

      {/* Available balance */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground flex items-center gap-1">
          Avbl <ChevronDown className="w-3 h-3" />
        </span>
        <span className="flex items-center gap-1">
          {availableBalance.toFixed(8)} {availableAsset}
          <CirclePlus className="w-4 h-4 text-yellow-500" />
        </span>
      </div>

      {/* Est. Fee */}
      <div className="text-xs text-muted-foreground underline cursor-pointer">
        Est. Fee
      </div>

      {/* Buy/Sell button */}
      <Button
        className={`w-full py-3 font-medium ${
          isBuy
            ? 'bg-green-500 hover:bg-green-600 text-white'
            : 'bg-red-500 hover:bg-red-600 text-white'
        }`}
      >
        {isBuy ? 'Buy' : 'Sell'} {baseAsset}
      </Button>
    </div>
  )
}

export interface OrderCardProps {
  baseAsset?: string
  quoteAsset?: string
  currentPrice?: number
  quoteBalance?: number
  baseBalance?: number
  marginLevel?: number
  leverage?: string
}

export function OrderCard({
  baseAsset = 'BANANAS31',
  quoteAsset = 'USDC',
  currentPrice = 0.004381,
  quoteBalance = 0,
  baseBalance = 983981.60465,
  marginLevel = 1.89,
  leverage = '3x',
}: Readonly<OrderCardProps>) {
  const [marketType, setMarketType] = useState<MarketType>('cross')
  const [orderType, setOrderType] = useState<OrderType>('limit')

  return (
    <Card className="bg-card/50 backdrop-blur">
      <CardContent className="p-4">
        {/* Market type tabs */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-4">
            {(['spot', 'cross', 'isolated'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setMarketType(type)}
                className={`text-sm capitalize pb-1 ${
                  marketType === type
                    ? 'text-foreground border-b-2 border-yellow-500'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">% Fee Level</span>
            <span className="text-muted-foreground">⚡ Calculator</span>
          </div>
        </div>

        {/* Order type tabs and margin info */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {(['limit', 'market', 'stop-limit'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setOrderType(type)}
                className={`text-xs capitalize ${
                  orderType === type
                    ? 'text-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {type === 'stop-limit' ? 'Stop Limit ▼' : type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
            <Info className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          {marketType !== 'spot' && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-green-500">🛡 ML {marginLevel.toFixed(2)}</span>
              <span className="border border-muted-foreground/30 rounded px-2 py-0.5">{leverage}</span>
              <Button variant="ghost" size="sm" className="h-6 text-xs px-2">
                Borrow/Repay
              </Button>
              <Button variant="ghost" size="sm" className="h-6 text-xs px-2">
                Transfer
              </Button>
            </div>
          )}
        </div>

        {/* Buy/Sell forms side by side */}
        <div className="grid grid-cols-2 gap-4">
          <OrderForm
            side="buy"
            baseAsset={baseAsset}
            quoteAsset={quoteAsset}
            currentPrice={currentPrice}
            availableBalance={quoteBalance}
            availableAsset={quoteAsset}
          />
          <OrderForm
            side="sell"
            baseAsset={baseAsset}
            quoteAsset={quoteAsset}
            currentPrice={currentPrice}
            availableBalance={baseBalance}
            availableAsset={baseAsset}
          />
        </div>
      </CardContent>
    </Card>
  )
}
