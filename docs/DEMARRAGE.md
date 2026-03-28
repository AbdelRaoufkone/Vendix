# VENDIX — Guide de démarrage

> Version 2.1 — Stack 100% gratuite, images base64, MVP complet.

---

## Lancer l'application

**Une seule commande depuis le dossier du projet :**

```bash
cd /Users/macbookpro/Documents/PROJETS/VENDIX
./start.sh
```

Le script fait tout automatiquement :
1. Tue les processus existants (ports 3000, 3001, 5000)
2. Démarre PostgreSQL + Redis via Docker
3. Installe les dépendances npm si besoin
4. Génère le client Prisma
5. Synchronise le schéma de base de données
6. Seed les données de démo
7. Lance le backend (port 5000) + frontend (port 3000)

**Résultat attendu :**

```
  VENDIX — Démarrage

▶ Attente PostgreSQL...
✓ PostgreSQL + Redis prêts
▶ Client Prisma...
▶ Schéma DB...
▶ Seed...
🌱 Seeding VENDIX...
✓ Utilisateur : admin@vendix.com / admin123
✓ Boutique : /boutique/demo-boutique
✓ Catégories créées
✓ 4 produits créés
✓ Client de démo créé
✓ Fournisseur de démo créé
✅ Seed terminé !
✓ Base de données prête

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  VENDIX est prêt !
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  → App        : http://localhost:3000
  → Boutique   : http://localhost:3000/boutique/demo-boutique
  → Dashboard  : http://localhost:3000/dashboard
  → API        : http://localhost:5000/health

  Connexion : admin@vendix.com / admin123

  Ctrl+C pour arrêter
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Ctrl+C** arrête le backend et le frontend en même temps.

---

## URLs de l'application

| URL | Description |
|---|---|
| http://localhost:3000 | Landing page |
| http://localhost:3000/register | Créer un compte commerçant |
| http://localhost:3000/login | Se connecter |
| http://localhost:3000/dashboard | Tableau de bord |
| http://localhost:3000/boutique/demo-boutique | Boutique publique de démo |
| http://localhost:5000/health | Santé de l'API |

---

## Compte de démo

```
Email    : admin@vendix.com
Password : admin123
```

Données pré-chargées : 4 produits, 2 catégories, 1 client, 1 fournisseur, 1 commande.

---

## Prérequis

- **Docker Desktop** installé et démarré — [docker.com](https://www.docker.com/products/docker-desktop/)
- **Node.js v18+** — `node --version`
- **npm v9+** — `npm --version`

> PostgreSQL et Redis sont gérés automatiquement par Docker. Pas besoin de les installer manuellement.

---

## Sans Docker (macOS Homebrew)

Si Docker n'est pas disponible, installer PostgreSQL et Redis nativement :

```bash
brew install postgresql@16 redis
brew services start postgresql@16
brew services start redis

# Créer la base de données
psql postgres -c "CREATE USER vendix WITH PASSWORD 'vendixpass';"
psql postgres -c "CREATE DATABASE vendix OWNER vendix;"
```

Puis lancer `./start.sh` normalement.

---

## Logs

### Console (terminal)

```bash
# Backend — requêtes, erreurs, warnings
tail -f /tmp/vendix-backend.log

# Frontend — compilation, erreurs Next.js
tail -f /tmp/vendix-frontend.log
```

### Fichiers archivés (JSON structuré)

```bash
# Logs du jour
tail -f app/backend/logs/vendix-$(date +%Y-%m-%d).log

# Erreurs seulement
tail -f app/backend/logs/vendix-errors-$(date +%Y-%m-%d).log
```

**Structure des fichiers de logs :**

```
app/backend/logs/
├── vendix-YYYY-MM-DD.log          ← tous les logs (30 jours)
├── vendix-errors-YYYY-MM-DD.log   ← erreurs seulement (90 jours)
├── vendix-exceptions-YYYY-MM-DD.log
└── vendix-rejections-YYYY-MM-DD.log
```

- Rotation automatique chaque jour à minuit
- Compression `.gz` des fichiers anciens
- Taille max 20MB par fichier

---

## Commandes utiles

```bash
# Tout killer et relancer proprement
pkill -f "tsx watch"; pkill -f "next dev"
./start.sh

# Voir la base de données (interface graphique)
cd app/backend && npm run db:studio
# → http://localhost:5555

# Relancer le seed (données de démo)
cd app/backend && npm run db:seed

# Vérifier que l'API répond
curl http://localhost:5000/health
```

---

## Déploiement en production (100% gratuit)

```bash
bash scripts/deploy.sh
```

Déploie sur : **Neon** (PostgreSQL) + **Upstash** (Redis) + **Render** (Backend) + **Vercel** (Frontend).

Voir [`docs/DEPLOIEMENT_GRATUIT.md`](./DEPLOIEMENT_GRATUIT.md) pour les détails.
