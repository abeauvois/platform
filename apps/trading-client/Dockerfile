# Trading Client Dockerfile
# Must be built from repository root: docker build -f apps/trading-client/Dockerfile .

FROM oven/bun:1.3.5 AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json bun.lock ./

# Copy all workspace package.json files for lockfile resolution
COPY apps/trading-client/package.json ./apps/trading-client/
COPY apps/trading-server/package.json ./apps/trading-server/
COPY apps/api/package.json ./apps/api/
COPY apps/cli/package.json ./apps/cli/
COPY apps/cli-landing/package.json ./apps/cli-landing/
COPY apps/dashboard/package.json ./apps/dashboard/

COPY packages/cached-http-client/package.json ./packages/cached-http-client/
COPY packages/platform-auth/package.json ./packages/platform-auth/
COPY packages/platform-db/package.json ./packages/platform-db/
COPY packages/platform-domain/package.json ./packages/platform-domain/
COPY packages/platform-sdk/package.json ./packages/platform-sdk/
COPY packages/platform-task/package.json ./packages/platform-task/
COPY packages/platform-ui/package.json ./packages/platform-ui/
COPY packages/platform-utils/package.json ./packages/platform-utils/
COPY packages/sdk-cli/package.json ./packages/sdk-cli/
COPY packages/trading-domain/package.json ./packages/trading-domain/
COPY packages/trading-sdk/package.json ./packages/trading-sdk/
COPY packages/platform-env/package.json ./packages/platform-env/

RUN bun install --frozen-lockfile

# Build stage
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build workspace packages that trading-client depends on
RUN cd packages/cached-http-client && bun run build || true
RUN cd packages/trading-domain && bun run build || true
RUN cd packages/trading-sdk && bun run build || true

# Build trading client
WORKDIR /app/apps/trading-client
ARG VITE_TRADING_API_URL
ARG VITE_AUTH_API_URL
ENV VITE_TRADING_API_URL=$VITE_TRADING_API_URL
ENV VITE_AUTH_API_URL=$VITE_AUTH_API_URL
RUN bun run build

# Production image - serve static files with Caddy
FROM caddy:2-alpine AS release
COPY --from=build /app/apps/trading-client/dist /srv
COPY --from=build /app/apps/trading-client/Caddyfile /etc/caddy/Caddyfile

EXPOSE 80

CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
