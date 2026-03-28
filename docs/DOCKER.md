# VENDIX — Guide Docker Complet

> La stack Docker permet de faire tourner VENDIX sur n'importe quelle machine avec **une seule commande**, sans installer Node.js, PostgreSQL ou Redis localement.

---

## Table des matières

1. [Prérequis](#1-prérequis)
2. [Structure des fichiers Docker](#2-structure-des-fichiers-docker)
3. [Démarrage en développement](#3-démarrage-en-développement)
4. [Démarrage en production](#4-démarrage-en-production)
5. [Commandes du quotidien (Makefile)](#5-commandes-du-quotidien-makefile)
6. [Architecture de la stack](#6-architecture-de-la-stack)
7. [Volumes et persistance des données](#7-volumes-et-persistance-des-données)
8. [Résolution des problèmes](#8-résolution-des-problèmes)
9. [Déploiement sur un serveur VPS](#9-déploiement-sur-un-serveur-vps)

---

## 1. Prérequis

**Un seul outil à installer : Docker Desktop.**

- macOS : https://www.docker.com/products/docker-desktop/
- Windows : https://www.docker.com/products/docker-desktop/
- Linux : https://docs.docker.com/engine/install/

Vérifier l'installation :
```bash
docker --version         # Docker version 25.x ou plus
docker compose version   # Docker Compose version v2.x
```

> Plus besoin d'installer Node.js, PostgreSQL ou Redis directement sur ta machine. Docker s'en charge.

---

## 2. Structure des fichiers Docker

```
VENDIX/
├── docker-compose.yml          ← Stack production complète (5 services)
├── docker-compose.dev.yml      ← Stack développement avec hot reload
├── .env.docker.example         ← Template variables d'environnement
├── Makefile                    ← Raccourcis make dev, make prod, etc.
├── nginx/
│   └── nginx.conf              ← Reverse proxy (routing API + frontend + WebSocket)
├── app/backend/
│   ├── Dockerfile              ← Image production (multi-stage, ~150MB)
│   ├── Dockerfile.dev          ← Image développement avec tsx watch
│   ├── .dockerignore
│   └── entrypoint.sh           ← Migrations Prisma → démarrage serveur
└── app/frontend/
    ├── Dockerfile              ← Image production standalone (~80MB)
    ├── Dockerfile.dev          ← Image développement Next.js
    └── .dockerignore
```

---

## 3. Démarrage en développement

Le mode développement active le **hot reload** : chaque modification de code est immédiatement reflétée sans redémarrer les containers.

### Étape 1 — Cloner/aller dans le projet

```bash
cd /Users/macbookpro/Documents/PROJETS/VENDIX
```

### Étape 2 — Démarrer la stack

```bash
make dev
```

Ou sans Makefile :
```bash
docker compose -f docker-compose.dev.yml up
```

C'est tout. Docker va automatiquement :
1. Télécharger les images PostgreSQL 16 et Redis 7
2. Construire les images backend et frontend
3. Démarrer tous les services dans le bon ordre
4. Créer les tables de la base de données (`prisma db push`)

### Ce que tu verras dans le terminal

```
vendix-postgres-dev  | database system is ready to accept connections
vendix-redis-dev     | Ready to accept connections
vendix-backend-dev   | [1/2] Synchronisation du schéma Prisma...
vendix-backend-dev   | VENDIX API running on port 5000
vendix-frontend-dev  | ▲ Next.js 14.1.0
vendix-frontend-dev  | - Local: http://localhost:3000
```

### URLs disponibles en développement

| Service | URL | Description |
|---|---|---|
| Application | http://localhost:3000 | Frontend Next.js |
| API | http://localhost:5000 | Backend Express |
| API Health | http://localhost:5000/health | Vérifier que l'API tourne |
| PostgreSQL | localhost:5432 | Accès direct DB (user: vendix, pass: vendixpass) |
| Redis | localhost:6379 | Accès direct Redis |

> En développement, PostgreSQL et Redis sont **exposés sur localhost** pour pouvoir utiliser Prisma Studio localement (`cd app/backend && npx prisma studio`).

### Arrêter le développement

```bash
# Ctrl+C dans le terminal, puis :
make dev-stop

# Ou en une commande :
docker compose -f docker-compose.dev.yml down
```

---

## 4. Démarrage en production

### Étape 1 — Créer le fichier .env

```bash
cp .env.docker.example .env
```

Ouvre `.env` et **obligatoirement** change ces valeurs :

```env
POSTGRES_PASSWORD=un_mot_de_passe_solide_ici
REDIS_PASSWORD=un_autre_mot_de_passe_ici
JWT_ACCESS_SECRET=une_chaine_de_50_caracteres_aleatoires_minimum
JWT_REFRESH_SECRET=une_autre_chaine_de_50_caracteres_differente
FRONTEND_URL=https://ton-domaine.com         # ou http://IP_SERVEUR
NEXT_PUBLIC_API_URL=https://ton-domaine.com/api
```

Pour générer des secrets JWT solides :
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# Exécuter deux fois pour avoir deux secrets différents
```

### Étape 2 — Démarrer la production

```bash
make prod
```

Ou sans Makefile :
```bash
docker compose up -d
```

Les images sont **construites localement** (multi-stage build). La première construction prend 2-5 minutes.

### Étape 3 — Vérifier que tout tourne

```bash
make ps-prod
```

Tu dois voir tous les containers avec le statut `healthy` :

```
NAME                STATUS
vendix-postgres     running (healthy)
vendix-redis        running (healthy)
vendix-backend      running (healthy)
vendix-frontend     running (healthy)
vendix-nginx        running
```

L'application est accessible sur http://localhost (port 80).

### Rebuild après modification du code

```bash
make prod-build
# Reconstruit les images et redémarre avec zéro downtime
```

---

## 5. Commandes du quotidien (Makefile)

```bash
make help              # Voir toutes les commandes disponibles

# ── Développement ─────────────────────────
make dev               # Démarrer en dev (terminal attaché, voir les logs)
make dev-detach        # Démarrer en dev en arrière-plan
make dev-stop          # Arrêter les containers dev
make dev-build         # Rebuild et démarrer en dev

# ── Production ────────────────────────────
make prod              # Démarrer en production
make prod-build        # Rebuild + démarrer
make prod-stop         # Arrêter la production
make prod-restart      # Redémarrer sans rebuild

# ── Logs ──────────────────────────────────
make logs              # Tous les logs dev en temps réel
make logs-backend      # Logs backend uniquement
make logs-frontend     # Logs frontend uniquement
make logs-prod         # Tous les logs production

# ── Base de données ────────────────────────
make db-studio         # Ouvrir Prisma Studio (interface graphique DB)
make db-migrate        # Créer une migration (te demande un nom)
make db-reset          # Réinitialiser la DB (SUPPRIME TOUT)
make db-shell          # Ouvrir un shell psql dans le container
make redis-shell       # Ouvrir redis-cli dans le container

# ── Maintenance ───────────────────────────
make ps                # État des containers dev
make ps-prod           # État des containers prod
make clean             # Supprimer containers + volumes dev
make prune             # Nettoyer images inutilisées
make exec-backend      # Ouvrir un shell dans le container backend
make exec-frontend     # Ouvrir un shell dans le container frontend
```

---

## 6. Architecture de la stack

```
                     ┌─────────────────────────────┐
                     │    Navigateur / Client        │
                     └──────────────┬───────────────┘
                                    │ :80
                     ┌──────────────▼───────────────┐
                     │         NGINX                 │
                     │      Reverse Proxy            │
                     │  (gzip, cache statiques,      │
                     │   headers sécurité, SSL)      │
                     └────────┬─────────┬────────────┘
                              │         │
              /api/* et       │         │  /* (tout le reste)
              /socket.io/*    │         │
                     ┌────────▼──┐  ┌───▼────────┐
                     │  BACKEND  │  │  FRONTEND  │
                     │  :5000    │  │   :3000    │
                     │ Express + │  │  Next.js   │
                     │ Socket.io │  │    PWA     │
                     └─────┬─────┘  └────────────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
      ┌───────▼──┐  ┌──────▼───┐  ┌────▼────────┐
      │ POSTGRES │  │  REDIS   │  │  CLOUDINARY │
      │  :5432   │  │  :6379   │  │  (externe)  │
      │ (données)│  │ (cache + │  │  (images)   │
      └──────────┘  │ sessions)│  └─────────────┘
                    └──────────┘
```

### Réseau interne

Tous les services communiquent via un réseau Docker interne (`vendix-network`). Seul Nginx est exposé sur le port 80. Les autres services ne sont **pas accessibles de l'extérieur** en production.

En développement, PostgreSQL (:5432) et Redis (:6379) sont exposés pour faciliter le debug avec des outils locaux.

### Routing Nginx

| Chemin | Destination | Note |
|---|---|---|
| `/api/*` | backend:5000 | API REST |
| `/socket.io/*` | backend:5000 | WebSocket (upgrade HTTP→WS) |
| `/health` | backend:5000 | Health check |
| `/_next/static/*` | frontend:3000 | Cache 1 an (immutable) |
| `/*` | frontend:3000 | Pages Next.js |

---

## 7. Volumes et persistance des données

Les données sont persistantes entre les redémarrages de containers via des volumes Docker nommés.

| Volume | Contenu | Supprimé par |
|---|---|---|
| `vendix-postgres-data` | Toutes les données de la base | `make clean` ou `docker volume rm` |
| `vendix-redis-data` | Cache et sessions Redis | `make clean` ou `docker volume rm` |
| `vendix-postgres-dev-data` | Données dev | `make clean` |
| `vendix-redis-dev-data` | Cache dev | `make clean` |

### Sauvegarder la base de données

```bash
# Créer un backup
docker exec vendix-postgres pg_dump -U vendix vendix > backup_$(date +%Y%m%d).sql

# Restaurer un backup
docker exec -i vendix-postgres psql -U vendix vendix < backup_20240315.sql
```

### Voir les volumes existants

```bash
docker volume ls | grep vendix
```

---

## 8. Résolution des problèmes

### "port is already allocated" (port déjà utilisé)

```bash
# Trouver ce qui utilise le port 80 ou 5432
sudo lsof -i :80
sudo lsof -i :5432

# Ou changer le port dans .env :
HTTP_PORT=8080   # pour Nginx

# Pour PostgreSQL en dev, modifier dans docker-compose.dev.yml :
# ports: ["5433:5432"]   (utiliser 5433 à la place)
```

### Le backend ne démarre pas ("Prisma migration failed")

```bash
# Voir les logs du backend
make logs-backend

# Cas courant : la DB n'est pas encore prête
# Solution : attendre quelques secondes, les healthchecks s'en occupent normalement
# Si persistant, réinitialiser :
make db-reset
```

### "Cannot find module" ou erreurs npm

```bash
# Reconstruire l'image depuis zéro
docker compose -f docker-compose.dev.yml up --build --force-recreate
```

### Hot reload ne fonctionne pas (modifications non détectées)

Sur macOS avec Docker Desktop, le hot reload peut parfois être lent. Solutions :

```bash
# Option 1 : Activer le polling dans Next.js
# Ajouter dans app/frontend/next.config.js :
# webpackDevMiddleware: config => { config.watchOptions = { poll: 1000, aggregateTimeout: 300 }; return config; }

# Option 2 : Utiliser la version native sans Docker pour le frontend
# Terminal 1 : make dev (lance postgres + redis + backend en Docker)
# Terminal 2 : cd app/frontend && npm run dev (frontend natif)
```

### Les données disparaissent au redémarrage

Cela arrive si tu utilises `docker compose down -v` (le `-v` supprime les volumes).
Utilise simplement `docker compose down` sans `-v` pour arrêter sans perdre les données.

### Voir les logs d'un service spécifique

```bash
# Dernières 100 lignes + temps réel
docker compose -f docker-compose.dev.yml logs -f --tail=100 backend

# Logs entre deux dates
docker compose logs --since="2024-03-15T10:00:00" --until="2024-03-15T11:00:00" backend
```

### Accéder à un shell dans un container

```bash
make exec-backend     # shell dans le backend
make exec-frontend    # shell dans le frontend
make db-shell         # psql dans PostgreSQL
make redis-shell      # redis-cli
```

---

## 9. Déploiement sur un serveur VPS

### Prérequis serveur

- Ubuntu 22.04 (ou Debian 12)
- 1 Go RAM minimum (2 Go recommandé)
- Docker + Docker Compose installés

```bash
# Installer Docker sur Ubuntu
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Déconnexion/reconnexion requise
```

### Déploiement

```bash
# 1. Copier le projet sur le serveur
scp -r /Users/macbookpro/Documents/PROJETS/VENDIX user@IP_SERVEUR:/opt/vendix

# OU via Git (recommandé)
ssh user@IP_SERVEUR
git clone https://github.com/ton-repo/vendix /opt/vendix

# 2. Aller dans le dossier
cd /opt/vendix

# 3. Créer et configurer .env
cp .env.docker.example .env
nano .env   # Remplir les valeurs de production

# 4. Démarrer
make prod

# 5. Vérifier
make ps-prod
curl http://localhost/health
```

### Ajouter HTTPS avec Let's Encrypt (Certbot)

```bash
# Installer Certbot
sudo apt install certbot python3-certbot-nginx -y

# Arrêter Nginx Docker temporairement
docker compose stop nginx

# Obtenir le certificat
sudo certbot certonly --standalone -d ton-domaine.com

# Modifier nginx/nginx.conf pour activer HTTPS (ajouter listen 443 ssl)
# Puis redémarrer
docker compose up -d nginx
```

### Mise à jour du projet

```bash
cd /opt/vendix
git pull origin main
make prod-build   # Rebuild les images et redémarre
```

### Redémarrage automatique après reboot serveur

Les containers ont `restart: unless-stopped` — ils redémarrent automatiquement si le serveur reboot, sauf si tu les as manuellement arrêtés avec `docker compose down`.
