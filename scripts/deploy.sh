#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════
#  VENDIX — Script de déploiement 100% gratuit
#  Neon (PostgreSQL) + Upstash (Redis) + Render (API) + Vercel (Frontend)
# ══════════════════════════════════════════════════════════════

set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'; BOLD='\033[1m'

log()  { echo -e "${BLUE}[VENDIX]${NC} $1"; }
ok()   { echo -e "${GREEN}✓${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC}  $1"; }
err()  { echo -e "${RED}✗${NC} $1"; }
step() { echo -e "\n${BOLD}━━━ $1 ━━━${NC}"; }

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND="$ROOT/app/backend"
FRONTEND="$ROOT/app/frontend"

echo -e "\n${BOLD}${BLUE}"
echo "  ██╗   ██╗███████╗███╗   ██╗██████╗ ██╗██╗  ██╗"
echo "  ██║   ██║██╔════╝████╗  ██║██╔══██╗██║╚██╗██╔╝"
echo "  ██║   ██║█████╗  ██╔██╗ ██║██║  ██║██║ ╚███╔╝ "
echo "  ╚██╗ ██╔╝██╔══╝  ██║╚██╗██║██║  ██║██║ ██╔██╗ "
echo "   ╚████╔╝ ███████╗██║ ╚████║██████╔╝██║██╔╝ ██╗"
echo "    ╚═══╝  ╚══════╝╚═╝  ╚═══╝╚═════╝ ╚═╝╚═╝  ╚═╝"
echo -e "${NC}"
log "Déploiement VENDIX — Stack 100% gratuite"
echo ""

# ── Vérification des outils ─────────────────────────────────────────────────
step "1/6 Vérification des outils"

check_tool() {
  if command -v "$1" &>/dev/null; then ok "$1 disponible"; else err "$1 manquant"; echo "   Installer : $2"; MISSING=1; fi
}

MISSING=0
check_tool git    "brew install git"
check_tool node   "brew install node"
check_tool npm    "installé avec node"
check_tool gh     "brew install gh  (GitHub CLI)"
check_tool vercel "npm install -g vercel"

if [ $MISSING -eq 1 ]; then
  echo ""
  err "Des outils sont manquants. Installe-les puis relance ce script."
  exit 1
fi
ok "Tous les outils sont présents"

# ── GitHub — push du code ────────────────────────────────────────────────────
step "2/6 GitHub — Publication du code"

cd "$ROOT"
if ! git rev-parse --is-inside-work-tree &>/dev/null; then
  log "Initialisation du dépôt Git..."
  git init
  git add .
  git commit -m "chore: initial VENDIX project"
  ok "Dépôt Git initialisé"
else
  log "Dépôt Git existant détecté"
  git add -A
  git diff --cached --quiet || git commit -m "chore: update before deploy"
fi

# Vérifier si remote origin existe
if git remote get-url origin &>/dev/null; then
  REPO_URL=$(git remote get-url origin)
  ok "Remote origin : $REPO_URL"
else
  log "Connexion à GitHub..."
  gh auth login 2>/dev/null || true

  REPO_NAME="vendix"
  log "Création du repo GitHub '$REPO_NAME'..."
  gh repo create "$REPO_NAME" --public --source=. --remote=origin --push
  ok "Repo créé et code poussé"
fi

# Push
git push origin main 2>/dev/null || git push origin master 2>/dev/null || git push --set-upstream origin main
ok "Code publié sur GitHub"

GITHUB_USER=$(gh api user -q '.login' 2>/dev/null || echo "")
REPO_URL="https://github.com/$GITHUB_USER/vendix"
log "Repo : $REPO_URL"

# ── Variables d'environnement ─────────────────────────────────────────────────
step "3/6 Collecte des URLs de services"

echo ""
echo -e "${YELLOW}Tu vas avoir besoin des infos de 2 services gratuits :${NC}"
echo ""
echo -e "  ${BOLD}Neon (PostgreSQL) — https://neon.tech${NC}"
echo "  1. Créer un projet 'vendix'"
echo "  2. Aller dans 'Connection Details'"
echo "  3. Sélectionner 'Prisma' dans le dropdown"
echo "  4. Copier la connection string"
echo ""
read -rp "  → Colle ici ton DATABASE_URL Neon : " DATABASE_URL

if [[ -z "$DATABASE_URL" ]]; then
  err "DATABASE_URL requis"
  exit 1
fi
ok "DATABASE_URL enregistrée"

echo ""
echo -e "  ${BOLD}Upstash (Redis) — https://upstash.com${NC}"
echo "  1. Créer une base 'vendix-redis'"
echo "  2. Aller dans Details → Redis URL"
echo "  3. Copier l'URL (commence par rediss://)"
echo ""
read -rp "  → Colle ici ton REDIS_URL Upstash : " REDIS_URL

if [[ -z "$REDIS_URL" ]]; then
  err "REDIS_URL requise"
  exit 1
fi
ok "REDIS_URL enregistrée"

# Lire les secrets depuis le .env local
JWT_ACCESS=$(grep JWT_ACCESS_SECRET "$ROOT/.env" | cut -d= -f2-)
JWT_REFRESH=$(grep JWT_REFRESH_SECRET "$ROOT/.env" | cut -d= -f2-)
SMTP_HOST=$(grep SMTP_HOST "$ROOT/.env" | cut -d= -f2-)
SMTP_PORT=$(grep SMTP_PORT "$ROOT/.env" | cut -d= -f2-)
SMTP_USER=$(grep SMTP_USER "$ROOT/.env" | cut -d= -f2-)
SMTP_PASS=$(grep SMTP_PASS "$ROOT/.env" | cut -d= -f2-)

# ── Render — Backend ────────────────────────────────────────────────────────
step "4/6 Render — Déploiement Backend"

echo ""
echo -e "${YELLOW}Déploiement Render (backend API) :${NC}"
echo ""
echo -e "  ${BOLD}Option A — Automatique (si tu as render CLI)${NC}"
echo "  → npm install -g @render-cli/cli && render deploy"
echo ""
echo -e "  ${BOLD}Option B — Manuel (2 minutes) :${NC}"
echo ""
echo "  1. Aller sur https://render.com → 'New' → 'Web Service'"
echo "  2. Connecter GitHub → sélectionner '$REPO_URL'"
echo "  3. Configurer :"
echo "     - Root Directory   : app/backend"
echo "     - Build Command    : npm install && npx prisma generate && npm run build"
echo "     - Start Command    : ./entrypoint.sh"
echo "     - Instance Type    : Free"
echo ""
echo "  4. Variables d'environnement à ajouter :"
echo ""
echo "     NODE_ENV           = production"
echo "     PORT               = 5000"
echo "     DATABASE_URL       = $DATABASE_URL"
echo "     REDIS_URL          = $REDIS_URL"
echo "     JWT_ACCESS_SECRET  = $JWT_ACCESS"
echo "     JWT_REFRESH_SECRET = $JWT_REFRESH"
echo "     SMTP_HOST          = $SMTP_HOST"
echo "     SMTP_PORT          = $SMTP_PORT"
echo "     SMTP_USER          = $SMTP_USER"
echo "     SMTP_PASS          = $SMTP_PASS"
echo "     SMTP_FROM          = VENDIX <$SMTP_USER>"
echo "     FRONTEND_URL       = (à remplir après étape Vercel)"
echo ""

read -rp "  → URL de ton service Render (ex: https://vendix-backend.onrender.com) : " BACKEND_URL

if [[ -z "$BACKEND_URL" ]]; then
  warn "BACKEND_URL non fournie — le frontend pointera sur localhost"
  BACKEND_URL="http://localhost:5000"
fi
ok "Backend URL : $BACKEND_URL"

# ── Vercel — Frontend ────────────────────────────────────────────────────────
step "5/6 Vercel — Déploiement Frontend"

log "Connexion à Vercel..."
cd "$FRONTEND"

# Créer le .env.production pour le build Vercel
cat > .env.production << EOF
NEXT_PUBLIC_API_URL=$BACKEND_URL
EOF

log "Lancement du déploiement Vercel..."
vercel --yes --prod \
  -e "NEXT_PUBLIC_API_URL=$BACKEND_URL" \
  --name "vendix-frontend" \
  2>&1 | tail -20

FRONTEND_URL=$(vercel ls vendix-frontend --json 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print('https://'+d[0].get('url',''))" 2>/dev/null || echo "")

if [[ -z "$FRONTEND_URL" ]]; then
  echo ""
  read -rp "  → Colle ici l'URL Vercel (ex: https://vendix-frontend.vercel.app) : " FRONTEND_URL
fi
ok "Frontend déployé : $FRONTEND_URL"

# ── Résumé final ────────────────────────────────────────────────────────────
step "6/6 Résumé du déploiement"

echo ""
echo -e "${GREEN}${BOLD}🎉 VENDIX est en ligne !${NC}"
echo ""
echo -e "  ${BOLD}Application${NC}"
echo -e "  → Frontend : ${BLUE}$FRONTEND_URL${NC}"
echo -e "  → Backend  : ${BLUE}$BACKEND_URL${NC}"
echo -e "  → API Health : ${BLUE}$BACKEND_URL/health${NC}"
echo ""
echo -e "  ${BOLD}Action restante sur Render :${NC}"
echo -e "  → Mettre à jour FRONTEND_URL = $FRONTEND_URL"
echo ""
echo -e "  ${BOLD}Domaine personnalisé (optionnel) :${NC}"
echo -e "  → Vercel : Dashboard → Domains → Ajouter ton domaine"
echo -e "  → Render : Dashboard → Custom Domains"
echo ""

# Sauvegarder les URLs
cat > "$ROOT/.deployment" << EOF
FRONTEND_URL=$FRONTEND_URL
BACKEND_URL=$BACKEND_URL
DATABASE_URL=$DATABASE_URL
DEPLOYED_AT=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
EOF

ok "Infos de déploiement sauvegardées dans .deployment"
echo ""
