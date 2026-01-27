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
  echo "==> Building and publishing $pkg..."
  cd "$ROOT_DIR/$pkg"
  bun run build
  npm publish
  cd "$ROOT_DIR"
done

echo "==> All packages published successfully."
