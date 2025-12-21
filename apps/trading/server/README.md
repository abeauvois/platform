# Trading Server

Trading-specific API server with Binance exchange integration.

## Architecture

This server runs as part of a **hybrid architecture**:

- **Trading Server (this)**: Handles trading-specific APIs (ticker, balance, klines)
- **Central Platform API**: Handles auth, todos, bookmarks, and shared features

The trading client connects to both servers via Vite proxy configuration.

## API Endpoints

| Route | Method | Purpose | Auth Required |
|-------|--------|---------|---------------|
| `/api/trading/ticker` | GET | Market ticker data | No |
| `/api/trading/klines` | GET | Historical candlesticks | No |
| `/api/trading/balance` | GET | Account balances | Binance API keys |
| `/api/docs` | GET | OpenAPI documentation | No |

## Development

```bash
# From monorepo root
bun run trading:server

# Or from this directory
bun run dev
```

Server runs on **port 3001**.

## Environment Variables

```env
DATABASE_URL=postgresql://...
BINANCE_API_KEY=your_api_key
BINANCE_API_SECRET=your_api_secret
CLIENT_URLS=http://localhost:5001  # Allowed CORS origins
```

## OpenAPI Documentation

Visit http://localhost:3001/api/docs for interactive API documentation (Scalar UI).
