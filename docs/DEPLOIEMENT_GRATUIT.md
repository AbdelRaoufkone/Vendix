# VENDIX — Déploiement 100% Gratuit

> Stack entièrement gratuite, sans carte bancaire pour commencer.
> Temps total : ~30 minutes.

---

## Stack choisie

| Composant | Service | Pourquoi |
|---|---|---|
| **Frontend** | Vercel | Gratuit illimité, fait pour Next.js, déploiement en 1 clic |
| **Backend** | Render | 750h/mois gratuit, support Node.js natif |
| **PostgreSQL** | Neon | 500MB gratuit, 0 carte bancaire, connexion pooling inclus |
| **Redis** | Upstash | 10 000 req/jour gratuit, serverless |
| **Emails** | Brevo | 300 emails/jour gratuit |
| **Images** | Base64 en DB | Aucun service, compressées à ~80KB côté client |

---

## Étape 1 — PostgreSQL avec Neon

### Créer le compte
1. Aller sur **https://neon.tech**
2. Cliquer "Sign up" → se connecter avec GitHub (le plus rapide)
3. Cliquer "New project"
4. Remplir :
   - **Name** : `vendix`
   - **Region** : choisir le plus proche (ex: EU Frankfurt)
5. Cliquer "Create project"

### Récupérer l'URL de connexion
1. Dans le dashboard Neon, aller dans **Connection Details**
2. Sélectionner **Prisma** dans le dropdown "Connection string"
3. Copier l'URL qui ressemble à :
   ```
   postgresql://vendix_owner:XXXXXXXX@ep-cool-name.eu-central-1.aws.neon.tech/vendix?sslmode=require
   ```
4. **Garder cette URL** — elle sera utilisée dans les prochaines étapes

> Neon génère automatiquement un utilisateur et un mot de passe. Tu n'as rien à créer.

---

## Étape 2 — Redis avec Upstash

### Créer le compte
1. Aller sur **https://upstash.com**
2. "Sign up" → connexion avec GitHub
3. Cliquer "Create Database"
4. Remplir :
   - **Name** : `vendix-redis`
   - **Type** : Regional
   - **Region** : choisir le même que Neon (ex: EU West)
5. Cliquer "Create"

### Récupérer l'URL Redis
1. Dans le dashboard Upstash, cliquer sur ta base
2. Aller dans l'onglet **Details**
3. Copier le **Redis URL** qui ressemble à :
   ```
   rediss://:XXXXXXXXXXXXXXXX@eu1-xxx.upstash.io:6379
   ```

---

## Étape 3 — Backend avec Render

### Préparer le code

Avant de déployer, créer un fichier `render.yaml` à la racine du projet backend :

```bash
# app/backend/render.yaml est créé automatiquement — voir docs/
```

Le fichier `app/backend/render.yaml` est déjà fourni dans le projet.

### Créer le compte Render
1. Aller sur **https://render.com**
2. "Get Started for Free" → connexion avec GitHub
3. Connecter ton dépôt GitHub (push le projet sur GitHub d'abord)

### Déployer le backend
1. Dashboard Render → "New" → "Web Service"
2. Connecter ton repo GitHub
3. Sélectionner le dossier `app/backend`
4. Remplir :
   - **Name** : `vendix-backend`
   - **Region** : Frankfurt (EU)
   - **Branch** : `main`
   - **Root Directory** : `app/backend`
   - **Runtime** : Node
   - **Build Command** : `npm install && npx prisma generate && npm run build`
   - **Start Command** : `./entrypoint.sh`
   - **Instance Type** : Free
5. Cliquer "Advanced" → "Add Environment Variables"

### Variables d'environnement à ajouter sur Render

| Clé | Valeur |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | L'URL Neon copiée à l'étape 1 |
| `REDIS_URL` | L'URL Upstash copiée à l'étape 2 |
| `JWT_ACCESS_SECRET` | `d44fcf905a2bb912e479b6dd1aa914ec782ae78d7ece3e202a9baa56907850258902dd40d025ede58f1a777cae94b5acf309ea84031d96fb1fffcaea1a07ebb8` |
| `JWT_REFRESH_SECRET` | `54c57aebd06b84babc266bf2f10c0d3a4a757e7b828dde59cd2f7344043cca367eeb97256a6b9ca2907d0b8fc2728abdab77c817aea09092e4c68be7ce28fdbb` |
| `FRONTEND_URL` | `https://vendix.vercel.app` (à mettre à jour après étape 4) |
| `PORT` | `5000` |

6. Cliquer "Create Web Service"
7. Render va construire et déployer (~5 minutes)
8. **Copier l'URL du service** : `https://vendix-backend.onrender.com`

> **Note importante :** Le plan gratuit de Render met le service en "veille" après 15 minutes d'inactivité. La première requête après une veille prend ~30 secondes. C'est normal pour la version gratuite.

---

## Étape 4 — Frontend avec Vercel

### Pousser le projet sur GitHub
```bash
cd /Users/macbookpro/Documents/PROJETS/VENDIX

# Initialiser git si pas déjà fait
git init
git add .
git commit -m "Initial commit VENDIX"

# Créer un repo sur github.com puis :
git remote add origin https://github.com/TON_USERNAME/vendix.git
git push -u origin main
```

### Déployer sur Vercel
1. Aller sur **https://vercel.com**
2. "Sign Up" → connexion avec GitHub
3. "New Project" → importer le repo `vendix`
4. Remplir :
   - **Framework Preset** : Next.js (détecté automatiquement)
   - **Root Directory** : `app/frontend`
5. Cliquer "Environment Variables" et ajouter :

| Clé | Valeur |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://vendix-backend.onrender.com` |

6. Cliquer "Deploy"
7. Vercel te donne une URL : `https://vendix.vercel.app`

### Mettre à jour FRONTEND_URL sur Render
1. Retourner sur Render → ton service backend
2. Environment → modifier `FRONTEND_URL` → `https://vendix.vercel.app`
3. "Save Changes" (redéploiement automatique)

---

## Étape 5 — Vérifier que tout fonctionne

### Test API
```bash
curl https://vendix-backend.onrender.com/health
# Réponse : {"status":"ok","version":"1.0.0"}
```

### Test inscription
```bash
curl -X POST https://vendix-backend.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com","password":"test1234","role":"MERCHANT"}'
```

### Test frontend
Ouvrir https://vendix.vercel.app dans le navigateur.

---

## Étape 6 — Emails avec Brevo (optionnel)

Pour envoyer les reçus par email (300 emails/jour gratuits) :

1. Aller sur **https://app.brevo.com**
2. Créer un compte gratuit
3. Aller dans **SMTP & API** → **SMTP**
4. Copier le Login, Password et Host
5. Ajouter sur Render :

| Clé | Valeur |
|---|---|
| `SMTP_HOST` | `smtp-relay.brevo.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | Ton email Brevo |
| `SMTP_PASS` | Le mot de passe SMTP Brevo |
| `SMTP_FROM` | `VENDIX <noreply@vendix.app>` |

---

## Résumé des URLs finales

| Service | URL |
|---|---|
| Application | https://vendix.vercel.app |
| API Backend | https://vendix-backend.onrender.com |
| API Health | https://vendix-backend.onrender.com/health |
| Dashboard Neon | https://console.neon.tech |
| Dashboard Upstash | https://console.upstash.com |

---

## Limites du plan gratuit

| Service | Limite | Impact |
|---|---|---|
| Render | 750h/mois, veille après 15min | Première requête lente (~30s) |
| Neon | 500MB stockage | ~500 000 produits avec images |
| Upstash | 10 000 req/jour | Suffisant pour le développement et beta |
| Vercel | Bande passante illimitée | Aucun impact |

**Quand passer au payant ?** Quand tu as des vrais utilisateurs actifs :
- Render → Plan Starter 7$/mois (pas de veille)
- Neon → Plan Launch 19$/mois (10GB)

---

## Mettre à jour l'application après modification du code

```bash
# Pousser les changements sur GitHub
git add .
git commit -m "Description des changements"
git push origin main

# Vercel et Render détectent automatiquement le push et redéploient
# Délai : 2-5 minutes
```
