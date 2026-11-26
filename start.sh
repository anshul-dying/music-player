#!/usr/bin/env bash
set -e

# Music Player — Local Development Startup Script

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

echo "=== [GaneGan] Starting Local Development ==="

# 1. Check local Redis
if command -v redis-cli >/dev/null 2>&1; then
  if redis-cli ping >/dev/null 2>&1; then
    echo "[✓] Local Redis is running"
  else
    echo "[!] Warning: Redis not responding on localhost:6379"
  fi
fi

# 2. Check local Postgres
if command -v pg_isready >/dev/null 2>&1; then
  if pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
    echo "[✓] Local Postgres is running"
  else
    echo "[!] Warning: Postgres not responding on localhost:5432"
  fi
fi

# 3. Ensure .env exists
if [ ! -f .env ] && [ -f .env.local ]; then
  cp .env.local .env
  echo "[✓] Created .env from .env.local"
fi

# 4. Run migrations
echo "==> Running DB migrations..."
pnpm db:migrate

# 5. Trap Ctrl+C to cleanly kill all child processes
cleanup() {
  echo ""
  echo "==> Shutting down servers..."
  kill $(jobs -p) 2>/dev/null || true
  wait 2>/dev/null || true
  echo "==> Stopped."
  exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# 6. Start API in background
echo "==> Starting API on http://localhost:4000 ..."
pnpm dev:api &
API_PID=$!

# 7. Start Worker in background
echo "==> Starting Worker (spotify-import) ..."
pnpm dev:worker &
WORKER_PID=$!

# 8. Start Next.js Web
echo "==> Starting Web on http://localhost:3000 ..."
echo ""
echo "----------------------------------------------------"
echo "  Web:    http://localhost:3000"
echo "  API:    http://localhost:4000  (Health: /healthz)"
echo "  Worker: spotify-import (BullMQ)"
echo "----------------------------------------------------"
echo "Press Ctrl+C to stop all services."
echo ""

pnpm dev:web &
WEB_PID=$!

# Wait for all processes
wait $API_PID $WORKER_PID $WEB_PID
