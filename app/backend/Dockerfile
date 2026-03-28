# ──────────────────────────────────────────────
# VENDIX Backend — Dockerfile Production
# ──────────────────────────────────────────────

# Stage 1 : Installer les dépendances
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --frozen-lockfile

# Stage 2 : Build TypeScript + Prisma client
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# Stage 3 : Image finale légère
FROM node:20-alpine AS runner
# dumb-init gère les signaux Unix proprement (SIGTERM → arrêt gracieux)
RUN apk add --no-cache dumb-init
WORKDIR /app
ENV NODE_ENV=production

# Copier uniquement ce qui est nécessaire à l'exécution
COPY --from=builder /app/dist              ./dist
COPY --from=builder /app/node_modules      ./node_modules
COPY --from=builder /app/prisma            ./prisma
COPY package*.json ./
COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

# Utilisateur non-root pour la sécurité
RUN addgroup --system --gid 1001 vendix && \
    adduser  --system --uid 1001 --ingroup vendix vendix
RUN chown -R vendix:vendix /app
USER vendix

EXPOSE 5000
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:5000/health || exit 1

ENTRYPOINT ["dumb-init", "--", "./entrypoint.sh"]
