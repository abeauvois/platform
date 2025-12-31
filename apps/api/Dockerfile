# API Server Dockerfile
# Must be built from repository root: docker build -f apps/api/Dockerfile .

FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json bun.lockb ./
COPY apps/api/package.json ./apps/api/
COPY packages/platform-db/package.json ./packages/platform-db/
COPY packages/platform-auth/package.json ./packages/platform-auth/
COPY packages/platform-domain/package.json ./packages/platform-domain/
COPY packages/platform-task/package.json ./packages/platform-task/
COPY packages/platform-utils/package.json ./packages/platform-utils/
COPY packages/platform-sdk/package.json ./packages/platform-sdk/
COPY packages/cached-http-client/package.json ./packages/cached-http-client/
RUN bun install --frozen-lockfile

# Build
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY . .

# Build packages first
RUN cd packages/cached-http-client && bun run build || true
RUN cd packages/platform-task && bun run build || true
RUN cd packages/platform-utils && bun run build || true

# Build API
WORKDIR /app/apps/api
RUN bun run build

# Production image
FROM oven/bun:1 AS release
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
