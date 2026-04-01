#!/bin/sh
set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  VENDIX — Démarrage du serveur API"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "[1/2] Application des migrations Prisma..."
npx prisma migrate deploy

echo "[2/3] Injection des données (Seed)..."
npx tsx prisma/seed.ts

echo "[3/3] Démarrage de l'API..."
exec node dist/index.js
