#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Packages to publish (in dependency order)
PACKAGES=(
  "packages/platform-task"
  "packages/platform-env"
  "packages/platform-core"
  "packages/platform-auth"
  "packages/platform-db"
  "packages/platform-utils"
  "packages/cached-http-client"
  "packages/platform-ingestion"
  "packages/platform-domain"
  "packages/gamification-domain"
  "packages/platform-sdk"
  "packages/gamification-sdk"
  "packages/platform-ui"
  "packages/browser-scraper"
)

# Build all packages first to resolve workspace dependencies
echo "==> Building all packages..."
cd "$ROOT_DIR"
bun run build

# Now publish each package
for pkg in "${PACKAGES[@]}"; do
  echo "==> Processing $pkg..."
  cd "$ROOT_DIR/$pkg"

  # Get package name and version from package.json
  PKG_NAME=$(node -p "require('./package.json').name")
  PKG_VERSION=$(node -p "require('./package.json').version")

  # Check if this version is already published
  PUBLISHED_VERSION=$(npm view "$PKG_NAME@$PKG_VERSION" version 2>/dev/null || echo "")

  if [ "$PUBLISHED_VERSION" = "$PKG_VERSION" ]; then
    echo "    $PKG_NAME@$PKG_VERSION already published, skipping..."
  else
    echo "    Publishing $PKG_NAME@$PKG_VERSION..."
    bun publish --no-interactive
  fi

  cd "$ROOT_DIR"
done

echo "==> All packages published successfully."
