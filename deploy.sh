#!/usr/bin/env bash
set -euo pipefail

COMPOSE="docker compose"

echo "==> Pulling latest code..."
git pull

echo "==> Building images..."
$COMPOSE build --pull

echo "==> Stopping old containers..."
$COMPOSE down --remove-orphans

echo "==> Starting services..."
$COMPOSE up -d

echo "==> Running seed (no-op if data exists)..."
$COMPOSE run --rm seed

echo "==> Done. evalkit is live."
$COMPOSE ps
