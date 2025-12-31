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
    VERSION=$(curl -fsSL "https://api.github.com/repos/$REPO/releases/latest" | grep '"tag_name"' | sed -E 's/.*"([^"]+)".*/\1/')
    if [ -z "$VERSION" ]; then
        echo "Failed to get latest version"
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
    if [[ ":$PATH:" != *":$INSTALL_DIR:"* ]]; then
        echo ""
        echo "Add this to your shell profile (~/.zshrc or ~/.bashrc):"
        echo ""
        echo "  export PATH=\"$INSTALL_DIR:\$PATH\""
        echo ""
        echo "Then run: source ~/.zshrc"
    fi
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
