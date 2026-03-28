# VENDIX — Plateforme de Commerce Moderne

> Remplace WhatsApp Business. Gérez vos commandes, clients, fournisseurs et boutique depuis une seule plateforme professionnelle, fiable et fluide.

---

## Pourquoi VENDIX existe

Les commerçants utilisent WhatsApp Business comme outil principal de vente. En pratique :

- **Perte de compte** — WhatsApp banne ou bug les comptes business sans avertissement
- **Données non sauvegardées** — commandes, contacts clients, historiques disparaissent
- **Pas de catalogue structuré** — les produits sont éparpillés dans des messages
- **Zéro gestion de stock** — tout est manuel et dans la tête du commerçant
- **Aucun reçu officiel** — pas de facture, pas de trace professionnelle
- **Mélange perso/pro** — le même numéro pour la famille et les clients
- **Pas de gestion fournisseur** — commandes fournisseurs dans des fils WhatsApp désorganisés
- **Aucune statistique** — impossible de savoir ce qui se vend, qui achète, quand

**VENDIX résout tout ça.**

---

## Concept Central

Chaque commerçant inscrit sur VENDIX obtient :

1. **Une boutique en ligne personnelle** — `vendix.app/boutique/nom-boutique`
2. **Un QR code unique** — à coller en vitrine, sur emballages, cartes de visite, réseaux sociaux
3. **Un tableau de bord professionnel** — gestion commandes, clients, stocks, fournisseurs
4. **Un canal de messagerie intégré** — les clients et fournisseurs écrivent directement dans l'app

Le client n'a **aucune app à installer** — il scanne le QR ou clique le lien, commande, et reçoit son reçu.

---

## Type d'application : PWA (Progressive Web App)

**Choix pour le lancement : PWA moderne et responsive.**

| Critère | PWA | App Mobile Native | Web classique |
|---|---|---|---|
| Délai de lancement | Immédiat | 2-4 semaines (stores) | Immédiat |
| Installation client | Optionnelle (home screen) | Obligatoire | Non |
| Fonctionne hors ligne | Oui | Oui | Non |
| Push notifications | Oui | Oui | Non |
| Un seul codebase | Oui | Non (iOS + Android) | Oui |
| Coût de dev | Faible | Élevé | Faible |
| Mise à jour | Instantanée | Store review (jours) | Instantanée |
| SEO (boutique visible) | Oui | Non | Oui |

> La PWA donne 95% des capacités d'une app mobile native sans les contraintes des stores Apple/Google. C'est le choix parfait pour le lancement.

---

## Structure du Projet

```
VENDIX/
├── docs/               ← Documentation complète
│   ├── README.md
│   ├── FEATURES.md
│   ├── ARCHITECTURE.md
│   ├── CANAL_CONTACT.md
│   └── WHY_BETTER_THAN_WB.md
└── app/                ← Code source
    ├── frontend/       ← Next.js 14 PWA (TypeScript + Tailwind)
    └── backend/        ← API Node.js / Prisma / PostgreSQL
```

---

## Documents

- [Fonctionnalités complètes](./FEATURES.md)
- [Pourquoi c'est mieux que WhatsApp Business](./WHY_BETTER_THAN_WB.md)
- [Canal de contact clients & fournisseurs](./CANAL_CONTACT.md)
- [Architecture technique](./ARCHITECTURE.md)
