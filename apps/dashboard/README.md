# Platform Dashboard

React web client for the platform.

## Architecture

This is a **client-only** React application that connects to the central Platform API server for all backend functionality.

- **Frontend**: React 19 + Vite + TailwindCSS + DaisyUI
- **Routing**: TanStack Router
- **State Management**: TanStack React Query
- **Backend**: Connects to Platform API (`/apps/api`) via Vite proxy

## Development

```bash
# From monorepo root
bun run dashboard

# Or from this directory
bun run dev
```

Client runs on **port 5000**.

**Note**: The API server must be running for the dashboard to function:

```bash
# Start both API and dashboard
bun run dev
```

## Scripts

```bash
bun run dev      # Start development server
bun run build    # Build for production
bun run serve    # Preview production build
bun run test     # Run tests
bun run lint     # Run ESLint
bun run format   # Run Prettier
```

## Environment Variables

```env
VITE_API_URL=http://localhost:3000  # Optional, defaults to proxy
```

## Proxy Configuration

The Vite dev server proxies all `/api/*` requests to `http://localhost:3000` (Platform API server).
