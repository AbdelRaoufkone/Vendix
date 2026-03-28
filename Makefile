# ══════════════════════════════════════════════
#  VENDIX — Makefile (raccourcis commandes)
#  Usage : make <commande>
# ══════════════════════════════════════════════

.PHONY: help dev dev-stop prod prod-stop prod-build logs logs-backend logs-frontend \
        db-studio db-reset db-migrate ps clean prune

# Afficher l'aide par défaut
help:
	@echo ""
	@echo "  VENDIX — Commandes disponibles"
	@echo "  ──────────────────────────────────────────"
	@echo "  Développement"
	@echo "    make dev           Démarrer en mode développement (hot reload)"
	@echo "    make dev-stop      Arrêter les containers de développement"
	@echo ""
	@echo "  Production"
	@echo "    make prod          Démarrer en production"
	@echo "    make prod-build    Rebuild les images et démarrer"
	@echo "    make prod-stop     Arrêter la production"
	@echo ""
	@echo "  Logs"
	@echo "    make logs          Voir tous les logs en temps réel"
	@echo "    make logs-backend  Logs du backend uniquement"
	@echo "    make logs-frontend Logs du frontend uniquement"
	@echo "    make logs-nginx    Logs de Nginx"
	@echo ""
	@echo "  Base de données"
	@echo "    make db-studio     Ouvrir Prisma Studio (navigateur)"
	@echo "    make db-migrate    Créer et appliquer une migration"
	@echo "    make db-reset      Réinitialiser la base (ATTENTION: supprime tout)"
	@echo ""
	@echo "  Maintenance"
	@echo "    make ps            Voir l'état des containers"
	@echo "    make clean         Supprimer containers et volumes DEV"
	@echo "    make prune         Nettoyer les images Docker inutilisées"
	@echo ""

# ── DÉVELOPPEMENT ────────────────────────────────────────────

dev:
	@echo "Démarrage VENDIX en développement..."
	docker compose -f docker-compose.dev.yml up

dev-detach:
	@echo "Démarrage VENDIX en développement (arrière-plan)..."
	docker compose -f docker-compose.dev.yml up -d

dev-stop:
	docker compose -f docker-compose.dev.yml down

dev-build:
	@echo "Rebuild des images de développement..."
	docker compose -f docker-compose.dev.yml up --build

# ── PRODUCTION ───────────────────────────────────────────────

prod:
	@[ -f .env ] || (echo "Erreur : fichier .env manquant. Copie .env.docker.example en .env" && exit 1)
	@echo "Démarrage VENDIX en production..."
	docker compose up -d

prod-build:
	@[ -f .env ] || (echo "Erreur : fichier .env manquant. Copie .env.docker.example en .env" && exit 1)
	@echo "Rebuild et démarrage en production..."
	docker compose up -d --build

prod-stop:
	docker compose down

prod-restart:
	docker compose restart

# ── LOGS ─────────────────────────────────────────────────────

logs:
	docker compose -f docker-compose.dev.yml logs -f

logs-backend:
	docker compose -f docker-compose.dev.yml logs -f backend

logs-frontend:
	docker compose -f docker-compose.dev.yml logs -f frontend

logs-nginx:
	docker compose logs -f nginx

logs-prod:
	docker compose logs -f

# ── BASE DE DONNÉES ───────────────────────────────────────────

db-studio:
	@echo "Ouverture de Prisma Studio sur http://localhost:5555"
	cd app/backend && npx prisma studio

db-migrate:
	@read -p "Nom de la migration : " name; \
	docker compose -f docker-compose.dev.yml exec backend \
	  npx prisma migrate dev --name $$name

db-reset:
	@echo "ATTENTION : Cela va supprimer toutes les données !"
	@read -p "Confirmer (oui) : " confirm; \
	[ "$$confirm" = "oui" ] && \
	docker compose -f docker-compose.dev.yml exec backend \
	  npx prisma migrate reset --force || echo "Annulé."

db-shell:
	docker compose -f docker-compose.dev.yml exec postgres \
	  psql -U vendix -d vendix

redis-shell:
	docker compose -f docker-compose.dev.yml exec redis redis-cli

# ── ÉTAT ET MAINTENANCE ───────────────────────────────────────

ps:
	docker compose -f docker-compose.dev.yml ps

ps-prod:
	docker compose ps

clean:
	@echo "Suppression des containers et volumes de développement..."
	docker compose -f docker-compose.dev.yml down -v

prune:
	@echo "Nettoyage des images Docker inutilisées..."
	docker image prune -f
	docker builder prune -f

# Exécuter une commande dans le container backend
exec-backend:
	docker compose -f docker-compose.dev.yml exec backend sh

exec-frontend:
	docker compose -f docker-compose.dev.yml exec frontend sh
