#!/usr/bin/env bash
# ══════════════════════════════════════════════════════
#  VENDIX — Démarrage en une seule commande
#  Usage : ./start.sh
# ══════════════════════════════════════════════════════

ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND="$ROOT/app/backend"
FRONTEND="$ROOT/app/frontend"

GREEN='\033[0;32m'; BLUE='\033[0;34m'; YELLOW='\033[1;33m'; BOLD='\033[1m'; NC='\033[0m'

log()  { echo -e "${BLUE}▶${NC} $1"; }
ok()   { echo -e "${GREEN}✓${NC} $1"; }
err()  { echo -e "${YELLOW}✗${NC} $1"; echo "Appuyez sur Entrée pour quitter..."; read dummy; exit 1; }

echo -e "\n${BOLD}${BLUE}  VENDIX${NC} — Démarrage\n"

# ── 0. Nettoyer les processus existants ───────────────────────────────────────

pkill -f "tsx watch" 2>/dev/null || true
pkill -f "next dev"  2>/dev/null || true
lsof -ti :5000 | xargs kill -9 2>/dev/null || true
lsof -ti :5001 | xargs kill -9 2>/dev/null || true
lsof -ti :3000 | xargs kill -9 2>/dev/null || true
lsof -ti :3005 | xargs kill -9 2>/dev/null || true
sleep 1

# ── 1. PostgreSQL + Redis ─────────────────────────────────────────────────────

if command -v docker &>/dev/null && docker info &>/dev/null 2>&1; then

  # PostgreSQL
  if docker ps -a --format '{{.Names}}' | grep -q "^vendix-pg$"; then
    docker start vendix-pg &>/dev/null || true
  else
    log "Création PostgreSQL..."
    docker run -d --name vendix-pg \
      -e POSTGRES_USER=vendix -e POSTGRES_PASSWORD=vendixpass -e POSTGRES_DB=vendix \
      -p 5444:5432 postgres:16 &>/dev/null
  fi

  # Redis
  if docker ps -a --format '{{.Names}}' | grep -q "^vendix-redis$"; then
    docker start vendix-redis &>/dev/null || true
  else
    log "Création Redis..."
    docker run -d --name vendix-redis -p 6380:6379 redis:7-alpine &>/dev/null
  fi

  # Attendre PostgreSQL (max 30s)
  log "Attente PostgreSQL..."
  for i in $(seq 1 30); do
    if docker exec vendix-pg pg_isready -U vendix -q 2>/dev/null; then
      break
    fi
    sleep 1
    if [ "$i" = "30" ]; then err "PostgreSQL n'a pas démarré après 30s"; fi
  done

  ok "PostgreSQL + Redis prêts"

else
  pg_isready -q 2>/dev/null || err "PostgreSQL ne répond pas. Installe Docker ou démarre PostgreSQL."
  redis-cli ping &>/dev/null 2>&1 || err "Redis ne répond pas. Installe Docker ou démarre Redis."
  ok "PostgreSQL + Redis détectés (natifs)"
fi

# ── 2. Dépendances npm ────────────────────────────────────────────────────────

if [ ! -d "$BACKEND/node_modules" ]; then
  log "Installation des dépendances backend..."
  cd "$BACKEND" && npm install --silent
  ok "Backend prêt"
fi

if [ ! -d "$FRONTEND/node_modules" ]; then
  log "Installation des dépendances frontend..."
  cd "$FRONTEND" && npm install --silent
  ok "Frontend prêt"
fi

# ── 3. Base de données + seed ─────────────────────────────────────────────────

cd "$BACKEND"

log "Client Prisma..."
npx prisma generate --silent 2>/dev/null

log "Schéma DB..."
npx prisma db push --skip-generate --accept-data-loss 2>/dev/null

log "Seed..."
npx tsx prisma/seed.ts

ok "Base de données prête"

# ── 4. Lancement ─────────────────────────────────────────────────────────────

echo ""
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}  VENDIX est prêt !${NC}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  ${GREEN}→ App        :${NC} http://localhost:3005"
echo -e "  ${GREEN}→ Boutique   :${NC} http://localhost:3005/boutique/demo-boutique"
echo -e "  ${GREEN}→ Dashboard  :${NC} http://localhost:3005/dashboard"
echo -e "  ${GREEN}→ API        :${NC} http://localhost:5001/health"
echo ""
echo -e "  ${BOLD}Connexion :${NC} admin@vendix.com / admin123"
echo ""
echo -e "  ${YELLOW}Ctrl+C pour arrêter${NC}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

trap 'kill 0' INT TERM

npx concurrently \
  --names "  API  , FRONT " \
  --prefix "[{name}]" \
  --prefix-colors "bgBlue.bold,bgMagenta.bold" \
  --timestamp-format "HH:mm:ss" \
  --kill-others \
  "cd \"$BACKEND\" && PORT=5001 npm run dev" \
  "cd \"$FRONTEND\" && PORT=3005 npm run dev"
