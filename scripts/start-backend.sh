#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"
BACKEND_DIR="$ROOT_DIR/backend"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing .env file at $ENV_FILE"
  echo "Copy .env.example to .env and fill values first."
  exit 1
fi

if [[ ! -d "$BACKEND_DIR" ]]; then
  echo "Missing backend directory at $BACKEND_DIR"
  exit 1
fi

if ! command -v go >/dev/null 2>&1; then
  echo "go is required but not found in PATH"
  exit 1
fi

# Export variables from .env for this process.
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

cd "$BACKEND_DIR"
exec go run ./cmd/api
