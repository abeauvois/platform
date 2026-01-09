#!/bin/bash
#
# Git Worktree Management Script
#
# Creates isolated worktrees for parallel PR development with automatic
# port offset configuration to avoid conflicts.
#
# Usage:
#   ./scripts/worktree.sh create <branch-name> [port-offset]
#   ./scripts/worktree.sh list
#   ./scripts/worktree.sh remove <branch-name>
#
# Examples:
#   ./scripts/worktree.sh create feature-auth 100
#   ./scripts/worktree.sh create bugfix-login 200
#   ./scripts/worktree.sh list
#   ./scripts/worktree.sh remove feature-auth
#
# Port Offset Scheme:
#   Offset 0:   API=3000, Dashboard=5000, Trading Server=3001, Trading Client=5001
#   Offset 100: API=3100, Dashboard=5100, Trading Server=3101, Trading Client=5101
#   Offset 200: API=3200, Dashboard=5200, Trading Server=3201, Trading Client=5201

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
WORKTREES_DIR="$(dirname "$REPO_ROOT")/platform-worktrees"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_success() { echo -e "${GREEN}$1${NC}"; }
print_warning() { echo -e "${YELLOW}$1${NC}"; }
print_error() { echo -e "${RED}$1${NC}"; }
print_info() { echo -e "${BLUE}$1${NC}"; }

create_worktree() {
    local NAME="${1:?Usage: $0 create <branch-name> [port-offset]}"
    local OFFSET="${2:-0}"

    # Base ports
    local BASE_API_PORT=3000
    local BASE_DASHBOARD_PORT=5000
    local BASE_TRADING_SERVER_PORT=3001
    local BASE_TRADING_CLIENT_PORT=5001

    # Calculate offset ports
    local API_PORT=$((BASE_API_PORT + OFFSET))
    local DASHBOARD_PORT=$((BASE_DASHBOARD_PORT + OFFSET))
    local TRADING_SERVER_PORT=$((BASE_TRADING_SERVER_PORT + OFFSET))
    local TRADING_CLIENT_PORT=$((BASE_TRADING_CLIENT_PORT + OFFSET))

    local WORKTREE_PATH="$WORKTREES_DIR/$NAME"

    echo ""
    print_info "=== Git Worktree Setup ==="
    echo "Worktree name: $NAME"
    echo "Worktree path: $WORKTREE_PATH"
    echo "Port offset: $OFFSET"
    echo ""
    echo "Ports:"
    echo "  API:            $API_PORT"
    echo "  Dashboard:      $DASHBOARD_PORT"
    echo "  Trading Server: $TRADING_SERVER_PORT"
    echo "  Trading Client: $TRADING_CLIENT_PORT"
    echo ""

    # Create worktrees directory if needed
    mkdir -p "$WORKTREES_DIR"

    # Create worktree (try creating new branch first, fall back to existing)
    print_info "Creating worktree..."
    cd "$REPO_ROOT"
    if git worktree add "$WORKTREE_PATH" -b "$NAME" 2>/dev/null; then
        print_success "Created new branch: $NAME"
    else
        git worktree add "$WORKTREE_PATH" "$NAME"
        print_warning "Using existing branch: $NAME"
    fi

    # Copy .env files from main repo
    print_info "Copying .env files..."

    for env_file in .env apps/api/.env apps/dashboard/.env apps/trading/.env packages/platform-db/.env; do
        if [ -f "$REPO_ROOT/$env_file" ]; then
            mkdir -p "$(dirname "$WORKTREE_PATH/$env_file")"
            cp "$REPO_ROOT/$env_file" "$WORKTREE_PATH/$env_file"
            echo "  Copied: $env_file"
        fi
    done

    # Append port configuration to root .env
    print_info "Configuring ports in .env..."
    cat >> "$WORKTREE_PATH/.env" << EOF

# Worktree port configuration (offset: $OFFSET)
PORT_OFFSET=$OFFSET
API_PORT=$API_PORT
API_URL=http://localhost:$API_PORT
DASHBOARD_PORT=$DASHBOARD_PORT
DASHBOARD_URL=http://localhost:$DASHBOARD_PORT
TRADING_SERVER_PORT=$TRADING_SERVER_PORT
TRADING_SERVER_URL=http://localhost:$TRADING_SERVER_PORT
TRADING_CLIENT_PORT=$TRADING_CLIENT_PORT
TRADING_CLIENT_URL=http://localhost:$TRADING_CLIENT_PORT
EOF

    # Update PORT in apps/api/.env if it exists
    if [ -f "$WORKTREE_PATH/apps/api/.env" ]; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s/^PORT=.*/PORT=$API_PORT/" "$WORKTREE_PATH/apps/api/.env" 2>/dev/null || true
            sed -i '' "s|BETTER_AUTH_URL=.*|BETTER_AUTH_URL=http://localhost:$API_PORT|" "$WORKTREE_PATH/apps/api/.env" 2>/dev/null || true
            sed -i '' "s|CLIENT_URL=.*|CLIENT_URL=http://localhost:$DASHBOARD_PORT|" "$WORKTREE_PATH/apps/api/.env" 2>/dev/null || true
        else
            sed -i "s/^PORT=.*/PORT=$API_PORT/" "$WORKTREE_PATH/apps/api/.env" 2>/dev/null || true
            sed -i "s|BETTER_AUTH_URL=.*|BETTER_AUTH_URL=http://localhost:$API_PORT|" "$WORKTREE_PATH/apps/api/.env" 2>/dev/null || true
            sed -i "s|CLIENT_URL=.*|CLIENT_URL=http://localhost:$DASHBOARD_PORT|" "$WORKTREE_PATH/apps/api/.env" 2>/dev/null || true
        fi
    fi

    # Update PORT in apps/trading/.env if it exists
    if [ -f "$WORKTREE_PATH/apps/trading/.env" ]; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s/^PORT=.*/PORT=$TRADING_SERVER_PORT/" "$WORKTREE_PATH/apps/trading/.env" 2>/dev/null || true
            sed -i '' "s|CLIENT_URL=.*|CLIENT_URL=http://localhost:$TRADING_CLIENT_PORT|" "$WORKTREE_PATH/apps/trading/.env" 2>/dev/null || true
        else
            sed -i "s/^PORT=.*/PORT=$TRADING_SERVER_PORT/" "$WORKTREE_PATH/apps/trading/.env" 2>/dev/null || true
            sed -i "s|CLIENT_URL=.*|CLIENT_URL=http://localhost:$TRADING_CLIENT_PORT|" "$WORKTREE_PATH/apps/trading/.env" 2>/dev/null || true
        fi
    fi

    echo ""
    print_success "=== Worktree Created Successfully ==="
    echo ""
    echo "Next steps:"
    echo "  cd $WORKTREE_PATH"
    echo "  bun install"
    echo "  bun run dev"
    echo ""
    echo "Your services will be available at:"
    echo "  API:            http://localhost:$API_PORT"
    echo "  Dashboard:      http://localhost:$DASHBOARD_PORT"
    echo "  Trading Server: http://localhost:$TRADING_SERVER_PORT"
    echo "  Trading Client: http://localhost:$TRADING_CLIENT_PORT"
    echo ""
}

list_worktrees() {
    print_info "=== Git Worktrees ==="
    git worktree list
    echo ""

    if [ -d "$WORKTREES_DIR" ]; then
        print_info "Platform worktrees directory: $WORKTREES_DIR"
        if [ "$(ls -A "$WORKTREES_DIR" 2>/dev/null)" ]; then
            echo "Contents:"
            ls -la "$WORKTREES_DIR"
        else
            echo "(empty)"
        fi
    else
        print_warning "Worktrees directory does not exist yet: $WORKTREES_DIR"
    fi
}

remove_worktree() {
    local NAME="${1:?Usage: $0 remove <branch-name>}"
    local WORKTREE_PATH="$WORKTREES_DIR/$NAME"

    if [ ! -d "$WORKTREE_PATH" ]; then
        print_error "Worktree not found: $WORKTREE_PATH"
        exit 1
    fi

    print_warning "Removing worktree: $NAME"
    cd "$REPO_ROOT"

    # Remove the worktree
    git worktree remove "$WORKTREE_PATH" --force

    # Optionally delete the branch
    read -p "Delete branch '$NAME'? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git branch -d "$NAME" 2>/dev/null || git branch -D "$NAME" 2>/dev/null || true
        print_success "Branch deleted: $NAME"
    fi

    print_success "Worktree removed: $NAME"
}

show_help() {
    echo "Git Worktree Management for Platform"
    echo ""
    echo "Usage: $0 {create|list|remove} [options]"
    echo ""
    echo "Commands:"
    echo "  create <name> [offset]  Create a new worktree with port offset"
    echo "                          offset: 0, 100, 200, etc. (default: 0)"
    echo "  list                    List all worktrees"
    echo "  remove <name>           Remove a worktree"
    echo ""
    echo "Examples:"
    echo "  $0 create feature-auth 100   # Create worktree with offset 100"
    echo "  $0 list                      # Show all worktrees"
    echo "  $0 remove feature-auth       # Remove worktree"
    echo ""
    echo "Port Offset Scheme:"
    echo "  Offset | API  | Dashboard | Trading Server | Trading Client"
    echo "  -------|------|-----------|----------------|---------------"
    echo "       0 | 3000 | 5000      | 3001           | 5001"
    echo "     100 | 3100 | 5100      | 3101           | 5101"
    echo "     200 | 3200 | 5200      | 3201           | 5201"
}

# Main command dispatch
case "${1:-help}" in
    create)
        create_worktree "$2" "$3"
        ;;
    list)
        list_worktrees
        ;;
    remove)
        remove_worktree "$2"
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac
