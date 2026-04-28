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

update_env_var() {
  local key="$1"
  local value="$2"
  local file="$3"

  if grep -q "^${key}=" "$file"; then
    if [[ "$OSTYPE" == darwin* ]]; then
      sed -i '' "s|^${key}=.*|${key}=${value}|" "$file"
    else
      sed -i "s|^${key}=.*|${key}=${value}|" "$file"
    fi
  else
    printf '\n%s=%s\n' "$key" "$value" >> "$file"
  fi
}

update_env_var "HALO_JWT_SIGNING_KEY" "$SECRET" "$ENV_FILE"

echo "Updated HALO_JWT_SIGNING_KEY in $ENV_FILE"
