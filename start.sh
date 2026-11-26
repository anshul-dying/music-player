#!/usr/bin/env bash
set -euo pipefail

# GaneGan — Local Development Startup Script

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

# Colors (disabled automatically when NO_COLOR is set or stdout is not a TTY)
if [ -t 1 ] && [ -z "${NO_COLOR:-}" ]; then
  BOLD=$'\033[1m'
  DIM=$'\033[2m'
  RED=$'\033[0;31m'
  GREEN=$'\033[0;32m'
  YELLOW=$'\033[0;33m'
  BLUE=$'\033[0;34m'
  MAGENTA=$'\033[0;35m'
  CYAN=$'\033[0;36m'
  CORAL=$'\033[38;5;209m'
  RESET=$'\033[0m'
else
  BOLD="" DIM="" RED="" GREEN="" YELLOW="" BLUE="" MAGENTA="" CYAN="" CORAL="" RESET=""
fi

ok()   { printf "  ${GREEN}[✓]${RESET} %s\n" "$1"; }
warn() { printf "  ${YELLOW}[!]${RESET} %s\n" "$1"; }
err()  { printf "  ${RED}[✗]${RESET} %s\n" "$1" >&2; }
step() { printf "\n${CYAN}==>${RESET} ${BOLD}%s${RESET}\n" "$1"; }

echo ""
printf "${CORAL}${BOLD}  ♫ GaneGan${RESET} ${DIM}— Local Development${RESET}\n"
printf "${DIM}  ──────────────────────────────────────────${RESET}\n"

# 0. Ensure dependencies are installed
if [ ! -d node_modules ]; then
  step "Installing workspace dependencies..."
  pnpm install
fi

# 1. Ensure .env exists
if [ ! -f .env ]; then
  if [ -f .env.local ]; then
    cp .env.local .env
    ok "Created .env from .env.local"
  elif [ -f .env.example ]; then
    cp .env.example .env
    warn "Created .env from .env.example (review secrets before prod)"
  fi
fi

# 2. Check local Redis & Postgres
step "Checking backing services..."
if command -v redis-cli >/dev/null 2>&1 && redis-cli ping >/dev/null 2>&1; then
  ok "Redis is running ${DIM}(localhost:6379)${RESET}"
else
  warn "Redis not responding on localhost:6379 ${DIM}(run 'pnpm db:up' if using Docker)${RESET}"
fi

if command -v pg_isready >/dev/null 2>&1 && pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
  ok "Postgres is running ${DIM}(localhost:5432)${RESET}"
else
  warn "Postgres not responding on localhost:5432 ${DIM}(run 'pnpm db:up' if using Docker)${RESET}"
fi

# 3. Package extension zip if missing so /extension download works locally
if [ ! -f frontend/app/public/downloads/ganegan-extension.zip ]; then
  step "Packaging companion extension zip..."
  pnpm package:ext
  ok "Packaged frontend/app/public/downloads/ganegan-extension.zip"
fi

# 4. Run database migrations
step "Running database migrations..."
pnpm db:migrate
ok "Database schema up to date"

# 5. Trap Ctrl+C to cleanly shut down all child processes
API_PID=""
WORKER_PID=""
WEB_PID=""
CLEANED_UP=0

cleanup() {
  [ "$CLEANED_UP" -eq 1 ] && return
  CLEANED_UP=1
  echo ""
  printf "${YELLOW}==>${RESET} ${BOLD}Shutting down servers...${RESET}\n"
  for pid in "$WEB_PID" "$WORKER_PID" "$API_PID"; do
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
    fi
  done
  kill $(jobs -p) 2>/dev/null || true
  wait 2>/dev/null || true
  printf "${GREEN}[✓]${RESET} Stopped cleanly.\n"
}
trap cleanup SIGINT SIGTERM EXIT

# 6. Start services
step "Starting services..."
pnpm dev:api &
API_PID=$!

pnpm dev:worker &
WORKER_PID=$!

pnpm dev:web &
WEB_PID=$!

echo ""
printf "${DIM}  ┌────────────────────────────────────────────────────────┐${RESET}\n"
printf "${DIM}  │${RESET}  ${BOLD}Web:${RESET}       ${CYAN}http://localhost:3000${RESET}                      ${DIM}│${RESET}\n"
printf "${DIM}  │${RESET}  ${BOLD}Dying UI:${RESET}  ${CYAN}http://localhost:3000/dying${RESET}                ${DIM}│${RESET}\n"
printf "${DIM}  │${RESET}  ${BOLD}API:${RESET}       ${MAGENTA}http://localhost:4000${RESET} ${DIM}(/healthz)${RESET}           ${DIM}│${RESET}\n"
printf "${DIM}  │${RESET}  ${BOLD}Worker:${RESET}    ${BLUE}spotify-import${RESET} ${DIM}(BullMQ)${RESET}                     ${DIM}│${RESET}\n"
printf "${DIM}  │${RESET}  ${BOLD}Extension:${RESET} ${DIM}run 'pnpm dev:ext' for WXT HMR${RESET}              ${DIM}│${RESET}\n"
printf "${DIM}  └────────────────────────────────────────────────────────┘${RESET}\n"
printf "  ${DIM}Press Ctrl+C to stop all services.${RESET}\n\n"

wait "$API_PID" "$WORKER_PID" "$WEB_PID"
