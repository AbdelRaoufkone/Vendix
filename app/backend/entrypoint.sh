#!/bin/sh
set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  VENDIX — Démarrage du serveur API"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "[1/2] Application des migrations Prisma..."
npx prisma migrate deploy

echo "[2/2] Démarrage de l'API..."
exec node dist/index.js
