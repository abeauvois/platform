import { Button, Card, CardContent, Label } from '@abeauvois/platform-ui'
import { calculatePricePrecision, formatPrice } from '@abeauvois/platform-trading-domain'
import { ChevronDown, CirclePlus, Info } from 'lucide-react'
import { useState } from 'react'
import { NumberInput, PercentageSlider, TabGroup } from './ui'

type MarketType = 'spot' | 'cross' | 'isolated'
type OrderType = 'limit' | 'market' | 'stop-limit'
type OrderMode = 'normal' | 'borrow' | 'repay'

const MARKET_TYPE_OPTIONS = [
  { value: 'spot' as const, label: 'Spot' },
  { value: 'cross' as const, label: 'Cross' },
  { value: 'isolated' as const, label: 'Isolated' },
]

const ORDER_TYPE_OPTIONS = [
  { value: 'limit' as const, label: 'Limit' },
  { value: 'market' as const, label: 'Market' },
  { value: 'stop-limit' as const, label: 'Stop Limit ▼' },
]

const ORDER_MODE_OPTIONS = [
  { value: 'normal' as const, label: 'Normal' },
  { value: 'borrow' as const, label: 'Borrow' },
  { value: 'repay' as const, label: 'Repay' },
]

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
  const [orderMode, setOrderMode] = useState<OrderMode>('normal')
  const [price, setPrice] = useState(currentPrice.toString())
  const [amount, setAmount] = useState('')
  const [sliderValue, setSliderValue] = useState(0)
  const [tpslEnabled, setTpslEnabled] = useState(false)

  const isBuy = side === 'buy'
  const total = Number(price) * Number(amount) || 0

  const handleSliderChange = (value: number) => {
    setSliderValue(value)
    if (availableBalance > 0 && Number(price) > 0) {
      const maxAmount = isBuy
        ? (availableBalance * value) / 100 / Number(price)
        : (availableBalance * value) / 100
      const precision = calculatePricePrecision(availableBalance)
      setAmount(maxAmount > 0 ? formatPrice(maxAmount, precision) : '')
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <TabGroup
          options={ORDER_MODE_OPTIONS}
          value={orderMode}
          onChange={(v) => setOrderMode(v as OrderMode)}
          variant="pill"
        />
        <Info className="w-3.5 h-3.5 text-muted-foreground" />
      </div>

      <NumberInput
        label="Price"
        value={price}
        onChange={setPrice}
        suffix={quoteAsset}
        referenceValue={currentPrice}
      />

      <NumberInput
        label="Amount"
        value={amount}
        onChange={setAmount}
        suffix={baseAsset}
        referenceValue={availableBalance}
      />

      <PercentageSlider value={sliderValue} onChange={handleSliderChange} />

      <div className="flex items-center bg-input/20 dark:bg-input/30 border border-input rounded-md px-3 py-2">
        <span className="text-muted-foreground text-xs w-12">Total</span>
        <span className="flex-1 text-right text-sm text-muted-foreground">
          {total > 0 ? total.toFixed(2) : 'Minimum 1'}
        </span>
        <span className="text-muted-foreground text-xs ml-2">{quoteAsset}</span>
      </div>

      <Label className="cursor-pointer">
        <input
          type="checkbox"
          checked={tpslEnabled}
          onChange={(e) => setTpslEnabled(e.target.checked)}
          className="w-4 h-4 rounded border-muted-foreground/30"
        />
        TP/SL
      </Label>

      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground flex items-center gap-1">
          Avbl <ChevronDown className="w-3 h-3" />
        </span>
        <span className="flex items-center gap-1">
          {availableBalance.toFixed(8)} {availableAsset}
          <CirclePlus className="w-4 h-4 text-yellow-500" />
        </span>
      </div>

      <div className="text-xs text-muted-foreground underline cursor-pointer">Est. Fee</div>

      <Button
        className={
          isBuy
            ? 'w-full py-3 bg-green-500 hover:bg-green-600 text-white'
            : 'w-full py-3 bg-red-500 hover:bg-red-600 text-white'
        }
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
        <div className="flex items-center justify-between mb-4">
          <TabGroup
            options={MARKET_TYPE_OPTIONS}
            value={marketType}
            onChange={(v) => setMarketType(v as MarketType)}
            variant="underline"
            size="md"
          />
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>% Fee Level</span>
            <span>⚡ Calculator</span>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <TabGroup
              options={ORDER_TYPE_OPTIONS}
              value={orderType}
              onChange={(v) => setOrderType(v as OrderType)}
            />
            <Info className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          {marketType !== 'spot' && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-green-500">🛡 ML {marginLevel.toFixed(2)}</span>
              <span className="border border-muted-foreground/30 rounded px-2 py-0.5">
                {leverage}
              </span>
              <Button variant="ghost" size="sm" className="h-6 text-xs px-2">
                Borrow/Repay
              </Button>
              <Button variant="ghost" size="sm" className="h-6 text-xs px-2">
                Transfer
              </Button>
            </div>
          )}
        </div>

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
