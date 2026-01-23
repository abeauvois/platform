# Pay-As-You-Go Credits System

## Virtual Currency: Credits (CR)

- Exchange rate: **1 EUR = 10 CR**
- Free starter credits: **50 CR**

## Costs

| Action | Cost |
|--------|------|
| Active day (first API call) | 1 CR |
| Trade executed | 1 CR |
| Future: Trade fee | 0.01% x amount x 10 CR (min 1 CR) |

## User Tiers

### Free Tier (default)
- Starts with 50 CR
- Can trade orders < $500
- After 50 CR consumed: must pay to continue trading

### Tier 1 (Paid)
- Purchased credits after free tier
- Can trade orders < $500
- No ads, full real-time data

### Tier 2 (Premium)
- Must purchase 1000+ CR (100 EUR)
- Can trade orders > $500
- Full access to all features

## Debt & Access Control

- Balance can go negative (debt)
- Daily charges continue even in debt
- **In debt + free tier exhausted**:
  - Trading: BLOCKED
  - Data viewing: ALLOWED (but no real-time)
  - Ads: SHOWN
- Must clear debt to resume trading

## Payment

- Credit card via Stripe
- Future: Bitcoin

## API Endpoints

### Credits
- `GET /api/gamification/credits/balance` - Get credit balance
- `GET /api/gamification/credits/access` - Get access context
- `GET /api/gamification/credits/transactions` - Get transaction history
- `GET /api/gamification/credits/can-trade` - Check trade permission
- `POST /api/gamification/credits/charge-trade` - Charge for executed trade
- `POST /api/gamification/credits/track-activity` - Track daily activity

### Payments
- `GET /api/gamification/payments/pricing` - Get pricing packages (public)
- `POST /api/gamification/payments/create-intent` - Create Stripe payment intent
- `GET /api/gamification/payments/history` - Get payment history

### Webhooks
- `POST /api/webhooks/stripe` - Stripe webhook handler

## Credit Packages

| Amount (EUR) | Credits | Notes |
|--------------|---------|-------|
| 5 | 50 | |
| 10 | 100 | Popular |
| 25 | 250 | |
| 50 | 500 | |
| 100 | 1000 | Tier 2 upgrade |
