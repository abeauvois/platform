# API Server Dockerfile
# Must be built from repository root: docker build -f apps/api/Dockerfile .

FROM oven/bun:1.3.6 AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json bun.lock ./

# Copy all workspace package.json files for lockfile resolution
COPY apps/api/package.json ./apps/api/
COPY apps/cli/package.json ./apps/cli/
COPY apps/cli-landing/package.json ./apps/cli-landing/
COPY apps/dashboard/package.json ./apps/dashboard/
COPY apps/gamification-api/package.json ./apps/gamification-api/
COPY packages/browser-scraper/package.json ./packages/browser-scraper/
COPY packages/cached-http-client/package.json ./packages/cached-http-client/
COPY packages/gamification-domain/package.json ./packages/gamification-domain/
COPY packages/gamification-sdk/package.json ./packages/gamification-sdk/
COPY packages/platform-auth/package.json ./packages/platform-auth/
COPY packages/platform-core/package.json ./packages/platform-core/
COPY packages/platform-db/package.json ./packages/platform-db/
COPY packages/platform-domain/package.json ./packages/platform-domain/
COPY packages/platform-ingestion/package.json ./packages/platform-ingestion/
COPY packages/platform-sdk/package.json ./packages/platform-sdk/
COPY packages/platform-task/package.json ./packages/platform-task/
COPY packages/platform-ui/package.json ./packages/platform-ui/
COPY packages/platform-utils/package.json ./packages/platform-utils/
COPY packages/sdk-cli/package.json ./packages/sdk-cli/
COPY packages/platform-env/package.json ./packages/platform-env/

RUN bun install --frozen-lockfile

# Build
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build packages first (order matters for dependencies)
RUN cd packages/platform-core && bun run build || true
RUN cd packages/cached-http-client && bun run build || true
RUN cd packages/platform-task && bun run build || true
RUN cd packages/platform-utils && bun run build || true
RUN cd packages/platform-ingestion && bun run build || true
RUN cd packages/browser-scraper && bun run build || true

# Build API
WORKDIR /app/apps/api
RUN bun run build

# Production image
FROM oven/bun:1.3.6 AS release
WORKDIR /app

# Copy built artifacts
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/apps/api/package.json ./

# Copy workspace packages (needed at runtime)
COPY --from=build /app/packages ./packages
COPY --from=build /app/node_modules ./node_modules

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["bun", "run", "./dist/index.js"]
