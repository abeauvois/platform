#!/bin/bash
# Platform CLI Installer
# Usage: curl -fsSL https://raw.githubusercontent.com/abeauvois/platform/main/apps/cli/install.sh | bash

set -e

REPO="abeauvois/platform"
BINARY_NAME="platform"
INSTALL_DIR="${INSTALL_DIR:-$HOME/.local/bin}"

# Detect OS and architecture
detect_platform() {
    OS=$(uname -s | tr '[:upper:]' '[:lower:]')
    ARCH=$(uname -m)

    case "$OS" in
        darwin) OS="macos" ;;
        linux) OS="linux" ;;
        mingw*|msys*|cygwin*) OS="windows" ;;
        *) echo "Unsupported OS: $OS"; exit 1 ;;
    esac

    case "$ARCH" in
        x86_64|amd64) ARCH="x64" ;;
        arm64|aarch64) ARCH="arm64" ;;
        *) echo "Unsupported architecture: $ARCH"; exit 1 ;;
    esac

    PLATFORM="${OS}-${ARCH}"
    echo "Detected platform: $PLATFORM"
}

# Get latest release version
get_latest_version() {
    # Allow version override via environment variable
    if [ -n "${VERSION:-}" ]; then
        echo "Using specified version: $VERSION"
        return
    fi

    # Try to get latest release from GitHub
    RELEASE_INFO=$(curl -fsSL "https://api.github.com/repos/$REPO/releases/latest" 2>/dev/null || echo "")
    VERSION=$(echo "$RELEASE_INFO" | grep '"tag_name"' | sed -E 's/.*"([^"]+)".*/\1/')

    if [ -z "$VERSION" ]; then
        echo "Error: No releases found for $REPO"
        echo ""
        echo "To create a release, run:"
        echo "  gh release create v1.0.0 apps/cli/bin/platform-* --title 'v1.0.0' --notes 'Initial release'"
        echo ""
        echo "Or specify a version manually:"
        echo "  VERSION=v1.0.0 bash install.sh"
        exit 1
    fi
    echo "Latest version: $VERSION"
}

# Download and install
install() {
    BINARY_URL="https://github.com/$REPO/releases/download/$VERSION/platform-$PLATFORM"

    if [ "$OS" = "windows" ]; then
        BINARY_URL="${BINARY_URL}.exe"
        BINARY_NAME="platform.exe"
    fi

    echo "Downloading from: $BINARY_URL"

    # Create install directory
    mkdir -p "$INSTALL_DIR"

    # Download binary
    curl -fsSL "$BINARY_URL" -o "$INSTALL_DIR/$BINARY_NAME"
    chmod +x "$INSTALL_DIR/$BINARY_NAME"

    echo "Installed to: $INSTALL_DIR/$BINARY_NAME"
}

# Add to PATH if needed
setup_path() {
    # Skip if already in PATH
    if [[ ":$PATH:" == *":$INSTALL_DIR:"* ]]; then
        return
    fi

    # Detect shell and profile
    SHELL_NAME=$(basename "$SHELL")
    case "$SHELL_NAME" in
        zsh)  PROFILE="$HOME/.zshrc" ;;
        bash) PROFILE="$HOME/.bashrc" ;;
        fish) PROFILE="$HOME/.config/fish/config.fish" ;;
        *)    PROFILE="$HOME/.profile" ;;
    esac

    # Create profile if it doesn't exist
    mkdir -p "$(dirname "$PROFILE")"
    touch "$PROFILE"

    # Check if already added
    if ! grep -q "/.local/bin" "$PROFILE" 2>/dev/null; then
        echo "" >> "$PROFILE"
        echo "# Platform CLI" >> "$PROFILE"
        if [ "$SHELL_NAME" = "fish" ]; then
            echo "set -gx PATH \"$INSTALL_DIR\" \$PATH" >> "$PROFILE"
        else
            echo "export PATH=\"$INSTALL_DIR:\$PATH\"" >> "$PROFILE"
        fi
        echo "Added PATH to $PROFILE"
    fi

    # Export for current session
    export PATH="$INSTALL_DIR:$PATH"
}

# Verify installation
verify() {
    if command -v platform &> /dev/null; then
        echo ""
        echo "Installation successful!"
        platform --version
    else
        echo ""
        echo "Binary installed. Restart your terminal or update PATH to use 'platform' command."
    fi
}

main() {
    echo "Installing Platform CLI..."
    echo ""
    detect_platform
    get_latest_version
    install
    setup_path
    verify
}

main
