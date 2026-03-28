# VENDIX — Avoir un Nom de Domaine

---

## Option 0 — Gratuit sans rien faire

Sans domaine acheté, VENDIX sera accessible sur :

| Service | URL gratuite |
|---|---|
| Frontend | `https://vendix-ton-nom.vercel.app` |
| Backend | `https://vendix-backend.onrender.com` |

Ces URLs fonctionnent parfaitement pour le lancement. Tu peux les partager, les mettre sur des flyers, en QR code.

---

## Option 1 — Domaine payant (~7-12€/an)

Un vrai domaine comme `vendix.app` ou `vendix.sn` donne une image plus professionnelle.

### Où acheter

| Registrar | Prix .com | Prix .app | Avantages |
|---|---|---|---|
| **Namecheap** | ~9$/an | ~14$/an | Interface simple, DNS gratuit, SSL gratuit |
| **Cloudflare** | ~10$/an | ~14$/an | Meilleur prix réel, protection DDoS incluse, le plus recommandé |
| **OVH** | ~8€/an | — | Français, support en français |
| **Ionos** | ~1€/an la 1ère année | — | Très pas cher pour commencer |

**Recommandation : Cloudflare Registrar** (cloudflare.com/products/registrar)
- Prix coûtant (pas de marge)
- SSL automatique
- Protection DDoS gratuite
- DNS ultra-rapide

### Choisir une extension

| Extension | Prix | Pour qui |
|---|---|---|
| `.app` | ~14$/an | Top pour une application web |
| `.com` | ~10$/an | Standard universel |
| `.shop` | ~3-5$/an | Axé commerce |
| `.sn` | Domaine Sénégal | Pour un marché local africain |
| `.ci` / `.ml` / `.bf` | Domaines Afrique | Selon le pays cible |

---

## Connecter le domaine à Vercel (frontend)

### Étape 1 — Acheter le domaine
Exemple : acheter `vendix.app` sur Cloudflare.

### Étape 2 — Ajouter le domaine sur Vercel
1. Aller sur **vercel.com** → ton projet → **Settings** → **Domains**
2. Cliquer **Add**
3. Taper `vendix.app` → **Add**
4. Vercel affiche les enregistrements DNS à configurer

### Étape 3 — Configurer les DNS

**Si domaine chez Cloudflare :**
1. Aller dans **cloudflare.com** → ton domaine → **DNS**
2. Supprimer tous les enregistrements A existants
3. Ajouter ce que Vercel indique, en général :

| Type | Nom | Valeur |
|---|---|---|
| `A` | `@` (racine) | `76.76.21.21` |
| `CNAME` | `www` | `cname.vercel-dns.com` |

4. Attendre 2-10 minutes → Vercel valide automatiquement

**Si domaine chez Namecheap :**
1. Namecheap → **Domain List** → **Manage** → **Advanced DNS**
2. Ajouter les mêmes enregistrements A et CNAME
3. Attendre 5-30 minutes (propagation DNS)

### Étape 4 — SSL automatique
Vercel génère un certificat SSL Let's Encrypt automatiquement. Ton site sera accessible en **https://vendix.app** dans les 5 minutes.

---

## Connecter le sous-domaine API à Render (backend)

Pour avoir `api.vendix.app` au lieu de `vendix-backend.onrender.com` :

### Sur Render
1. Dashboard → ton service backend → **Settings** → **Custom Domains**
2. Cliquer **Add Custom Domain**
3. Taper `api.vendix.app` → **Save**
4. Render affiche un enregistrement CNAME à créer

### Sur ton registrar (Cloudflare)
Ajouter l'enregistrement DNS indiqué par Render :

| Type | Nom | Valeur |
|---|---|---|
| `CNAME` | `api` | `your-service.onrender.com` |

### Mettre à jour les variables d'environnement

Après configuration, mettre à jour sur Render et Vercel :

```
FRONTEND_URL=https://vendix.app
NEXT_PUBLIC_API_URL=https://api.vendix.app
```

---

## Architecture DNS finale

```
vendix.app          → Vercel (frontend Next.js)
www.vendix.app      → Vercel (redirect vers vendix.app)
api.vendix.app      → Render (backend API)
```

Les boutiques des commerçants seront accessibles sur :
```
vendix.app/boutique/nom-boutique
```

---

## Résumé des coûts

| Scénario | Coût annuel |
|---|---|
| Gratuit (sous-domaines Vercel/Render) | 0€ |
| Domaine `.app` chez Cloudflare | ~14$/an |
| Domaine `.com` chez Cloudflare | ~10$/an |
| Domaine `.sn` (Sénégal) | ~15-20€/an |

SSL, hébergement frontend, hébergement backend : **0€** dans tous les cas.
