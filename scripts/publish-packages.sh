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

# Build all packages first
echo "==> Building all packages..."
cd "$ROOT_DIR"
bun run build

# Collect all package versions into a JSON file
echo "==> Collecting package versions..."
VERSIONS_FILE=$(mktemp)
echo "{" > "$VERSIONS_FILE"
first=true
for pkg in "${PACKAGES[@]}"; do
  cd "$ROOT_DIR/$pkg"
  name=$(node -p "require('./package.json').name")
  version=$(node -p "require('./package.json').version")
  if [ "$first" = true ]; then
    first=false
  else
    echo "," >> "$VERSIONS_FILE"
  fi
  echo "  \"$name\": \"$version\"" >> "$VERSIONS_FILE"
  cd "$ROOT_DIR"
done
echo "}" >> "$VERSIONS_FILE"

echo "    Versions collected: $(cat $VERSIONS_FILE | tr -d '\n')"

# Now publish each package
for pkg in "${PACKAGES[@]}"; do
  echo "==> Processing $pkg..."
  cd "$ROOT_DIR/$pkg"

  PKG_NAME=$(node -p "require('./package.json').name")
  PKG_VERSION=$(node -p "require('./package.json').version")

  # Check if already published
  PUBLISHED_VERSION=$(npm view "$PKG_NAME@$PKG_VERSION" version 2>/dev/null || echo "")

  if [ "$PUBLISHED_VERSION" = "$PKG_VERSION" ]; then
    echo "    $PKG_NAME@$PKG_VERSION already published, skipping..."
  else
    # Replace workspace:* with actual versions
    echo "    Resolving workspace dependencies..."
    node -e "
      const fs = require('fs');
      const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const versions = JSON.parse(fs.readFileSync('$VERSIONS_FILE', 'utf8'));
      
      ['dependencies', 'devDependencies', 'peerDependencies'].forEach(depType => {
        if (pkg[depType]) {
          Object.keys(pkg[depType]).forEach(name => {
            if (pkg[depType][name] === 'workspace:*' && versions[name]) {
              console.log('      ' + name + ': workspace:* -> ' + versions[name]);
              pkg[depType][name] = versions[name];
            }
          });
        }
      });
      
      fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
    "
    
    echo "    Publishing $PKG_NAME@$PKG_VERSION..."
    bun publish --no-interactive
  fi

  cd "$ROOT_DIR"
done

rm -f "$VERSIONS_FILE"
echo "==> All packages published successfully."
