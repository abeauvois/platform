# STOP_LOSS Order Scenario

This document describes a STOP_LOSS order scenario with mock data demonstrating how and when the stop is triggered.

## Overview

A **STOP_LOSS** order is a conditional order that triggers when the market price reaches a specified stop price. It's used to limit losses on an existing position by automatically selling (for long positions) or buying (for short positions) when the price moves against you.

### Order Types

| Type | Description |
|------|-------------|
| `stop_loss` | Triggers a **market order** when stop price is reached |
| `stop_loss_limit` | Triggers a **limit order** when stop price is reached |

## Trigger Logic

The system uses `detectStopOrderCategory()` to determine if an order is a STOP_LOSS:

| Side | Stop Price Position | Category |
|------|---------------------|----------|
| **SELL** | stopPrice <= currentPrice | `stop_loss` |
| **BUY** | stopPrice >= currentPrice | `stop_loss` |

```typescript
// From packages/trading-domain/src/utils/orderTypeDetector.ts
if (side === 'sell') {
  // SELL below current = STOP_LOSS (exit to limit losses)
  return stopPrice <= currentPrice ? 'stop_loss' : 'take_profit'
}
```

---

## Scenario: Protecting a Long BTCUSDT Position

### Context

A trader bought 0.5 BTC at $44,000 and wants to limit potential losses. They set a stop loss at $43,000 to automatically exit if the price drops 2.27%.

### Initial State

```
Position: 0.5 BTC (Long)
Entry Price: $44,000
Current Market Price: $44,000
Risk Tolerance: $500 (2.27% of position value)
```

---

## Mock Data

### 1. Order Creation Request

```typescript
// POST /api/orders
const createOrderRequest: CreateOrderData = {
  symbol: "BTCUSDT",
  side: "sell",           // Selling to exit long position
  type: "stop_loss",      // Market order when triggered
  quantity: 0.5,
  stopPrice: 43000,       // Trigger price
  timeInForce: "GTC"      // Good Till Cancelled
}
```

### 2. Order Response (Pending)

```typescript
const orderResponse: Order = {
  id: "ord_sl_20240115_001",
  symbol: "BTCUSDT",
  side: "sell",
  type: "stop_loss",
  quantity: 0.5,
  stopPrice: 43000,
  status: "pending",      // Waiting for trigger
  filledQuantity: 0,
  createdAt: new Date("2024-01-15T10:30:00Z"),
  updatedAt: new Date("2024-01-15T10:30:00Z")
}
```

### 3. Market Price Movement

```typescript
// Price feed over time (simulated)
const priceHistory = [
  { time: "10:30:00", price: 44000.00 },  // Order placed
  { time: "10:45:00", price: 43800.50 },  // Price dropping
  { time: "11:00:00", price: 43500.25 },  // Continued decline
  { time: "11:15:00", price: 43100.00 },  // Approaching stop
  { time: "11:22:00", price: 43000.00 },  // STOP TRIGGERED
  { time: "11:22:01", price: 42985.50 },  // Market order fills
]
```

### 4. Stop Triggered Event

When price reaches $43,000:

```typescript
const triggerEvent = {
  orderId: "ord_sl_20240115_001",
  triggerPrice: 43000,
  marketPriceAtTrigger: 43000.00,
  triggeredAt: new Date("2024-01-15T11:22:00Z"),
  action: "EXECUTE_MARKET_SELL"
}
```

### 5. Order Filled Response

```typescript
const filledOrder: Order = {
  id: "ord_sl_20240115_001",
  symbol: "BTCUSDT",
  side: "sell",
  type: "stop_loss",
  quantity: 0.5,
  stopPrice: 43000,
  status: "filled",           // Order completed
  filledQuantity: 0.5,
  filledPrice: 42985.50,      // Actual fill price (slight slippage)
  createdAt: new Date("2024-01-15T10:30:00Z"),
  updatedAt: new Date("2024-01-15T11:22:01Z")
}
```

---

## Order Lifecycle Timeline

```
TIME        PRICE      EVENT
-----------------------------------------
10:30:00    $44,000    Order created (pending)
                       Stop price: $43,000

10:45:00    $43,800    Price dropping, order still pending

11:00:00    $43,500    Price continues to fall

11:15:00    $43,100    Approaching stop price

11:22:00    $43,000    STOP PRICE REACHED
                       Order triggered -> Market sell executed

11:22:01    $42,985    Order filled at $42,985.50
                       (0.03% slippage from stop price)
```

---

## Financial Summary

```
Entry Price:      $44,000.00
Exit Price:       $42,985.50
Position Size:    0.5 BTC

Entry Value:      $22,000.00  (0.5 x $44,000)
Exit Value:       $21,492.75  (0.5 x $42,985.50)

Realized Loss:    -$507.25    (-2.30%)
```

The stop loss successfully limited the loss to approximately $507 instead of potentially larger losses if the price continued to fall.

---

## API Request Example (cURL)

```bash
curl -X POST http://localhost:3001/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "symbol": "BTCUSDT",
    "side": "sell",
    "type": "stop_loss",
    "quantity": 0.5,
    "stopPrice": 43000
  }'
```

---

## STOP_LOSS_LIMIT Variant

For more control over execution price, use `stop_loss_limit`:

```typescript
const stopLossLimitOrder: CreateOrderData = {
  symbol: "BTCUSDT",
  side: "sell",
  type: "stop_loss_limit",  // Limit order variant
  quantity: 0.5,
  stopPrice: 43000,         // Trigger price
  price: 42950,             // Limit price (below stop for SELL)
  timeInForce: "GTC"
}
```

**Trade-off:** The limit order may not fill if the price drops quickly past your limit price, but you avoid unexpected slippage.

---

## Related Files

- Order types: `packages/trading-domain/src/types.ts`
- Trigger detection: `packages/trading-domain/src/utils/orderTypeDetector.ts`
- Binance integration: `apps/trading/server/adapters/BinanceClient.ts`
- Order routes: `apps/trading/server/routes/order.openapi.routes.ts`
