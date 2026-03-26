#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing .env file at $ENV_FILE"
  echo "Copy .env.example to .env and fill values first."
  exit 1
fi

# Export variables from .env for this process.
set -a
source "$ENV_FILE"
set +a

cd "$ROOT_DIR/backend"
exec go run ./cmd/api
