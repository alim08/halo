#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing .env file at $ENV_FILE"
  echo "Copy .env.example to .env first."
  exit 1
fi

if ! command -v openssl >/dev/null 2>&1; then
  echo "openssl is required but not found"
  exit 1
fi

SECRET="$(openssl rand -base64 48 | tr -d '\n')"

if grep -q '^HALO_JWT_SIGNING_KEY=' "$ENV_FILE"; then
  # macOS-compatible inline edit
  sed -i '' "s|^HALO_JWT_SIGNING_KEY=.*|HALO_JWT_SIGNING_KEY=$SECRET|" "$ENV_FILE"
else
  echo "HALO_JWT_SIGNING_KEY=$SECRET" >> "$ENV_FILE"
fi

echo "Generated and saved HALO_JWT_SIGNING_KEY to $ENV_FILE"
