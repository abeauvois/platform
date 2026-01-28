#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

PACKAGES=(
  "packages/platform-task"
  "packages/platform-env"
  "packages/platform-auth"
  "packages/gamification-domain"
  "packages/platform-domain"
  "packages/platform-sdk"
  "packages/platform-ui"
  "packages/gamification-sdk"
)

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
    echo "    Building and publishing $PKG_NAME@$PKG_VERSION..."
    bun run build
    npm publish
  fi

  cd "$ROOT_DIR"
done

echo "==> All packages published successfully."
