# VENDIX — Fonctionnalités Complètes

---

## MODULE 1 — BOUTIQUE EN LIGNE

### 1.1 Page Vitrine Publique
- URL personnalisée : `vendix.app/boutique/[slug]`
- QR Code téléchargeable (PDF haute qualité pour impression)
- Logo, bannière, description, horaires, localisation
- Badge "Ouvert / Fermé" automatique selon les horaires
- Thème couleur personnalisable (branding)
- Partage direct sur WhatsApp, Instagram, Facebook, TikTok
- SEO optimisé (boutique visible sur Google)

### 1.2 Catalogue Produits
- Ajout produit avec photos (multiple), nom, description, prix
- Catégories et sous-catégories
- Variantes : taille, couleur, poids, etc.
- Prix promotionnel avec date d'expiration
- Indicateur stock : disponible / stock faible / rupture
- Produits mis en avant / bestsellers
- Recherche et filtre côté client
- Mode brouillon (produit invisible jusqu'à publication)

### 1.3 Commandes Client (côté boutique)
- Réception instantanée des commandes (notification push + son)
- Statuts : Reçue → Confirmée → En préparation → Prête → Livrée → Annulée
- Notes et instructions spéciales du client
- Modification de commande possible avant confirmation
- Commandes multiples produits dans un panier

---

## MODULE 2 — GESTION COMMANDES (Tableau de Bord Commerçant)

### 2.1 Vue Commandes
- Liste en temps réel toutes les commandes
- Filtres : statut, date, client, produit, montant
- Recherche rapide par numéro ou nom client
- Vue Kanban (colonnes par statut) + Vue liste
- Commandes urgentes mises en avant
- Impression fiche de préparation

### 2.2 Traitement Commande
- Accepter / Refuser en un clic
- Modifier les articles si rupture partielle
- Assigner à un employé
- Ajouter des frais de livraison
- Appliquer un code promo ou réduction manuelle
- Planifier la livraison (heure, livreur)

### 2.3 Reçus & Factures
- Génération automatique PDF professionnel
- Logo boutique + coordonnées légales
- Détail articles, quantités, prix unitaire, total
- Numéro de commande unique (QR code traçable)
- Numéro TVA (si applicable)
- Envoi automatique au client par : lien dans le chat, email, SMS
- Historique de tous les reçus archivés
- Factures fournisseur séparées des reçus client

---

## MODULE 3 — GESTION CLIENTS

### 3.1 Répertoire Clients
- Profil automatique créé à la première commande
- Nom, téléphone, adresse(s) de livraison sauvegardée
- Historique complet toutes commandes
- Total dépensé, commande moyenne, fréquence d'achat
- Notes privées du commerçant sur le client
- Étiquettes : VIP, Mauvais payeur, Livraison difficile, etc.

### 3.2 Fidélisation
- Points de fidélité automatiques par commande
- Récompenses configurables (remise, produit offert)
- Suivi solde points client
- Rappels automatiques : "Votre commande habituelle ?"

### 3.3 Communication Client
- Messagerie intégrée (voir Module 5)
- Notifications statut commande automatiques
- Rappel de commande non finalisée
- Message groupé à tous les clients (annonce promo, fermeture)

---

## MODULE 4 — GESTION STOCKS & INVENTAIRE

### 4.1 Stock en Temps Réel
- Quantité disponible par produit/variante
- Décrément automatique à chaque commande confirmée
- Alerte seuil critique (ex: "Reste 3 en stock")
- Blocage automatique commande si stock = 0

### 4.2 Mouvements de Stock
- Historique entrées/sorties
- Réassort depuis commande fournisseur (auto)
- Ajustement manuel avec motif (casse, vol, don)
- Export inventaire Excel/CSV

### 4.3 Valorisation Stock
- Valeur totale du stock en temps réel
- Coût d'achat vs prix de vente (marge brute)
- Rapport produits dormants (pas vendus depuis X jours)

---

## MODULE 5 — MESSAGERIE INTÉGRÉE (Canal de Contact)

### 5.1 Chat Client ↔ Boutique
- Interface chat moderne (style app mobile)
- Accessible depuis la page boutique publique SANS compte
- Client identifié par son numéro de téléphone (OTP SMS) ou email
- Messagerie persistante (historique conservé)
- Partage photo (photos produit, preuve paiement, etc.)
- Statuts message : envoyé / lu
- Le commerçant répond depuis son tableau de bord
- Notifications push pour chaque nouveau message

### 5.2 Chat Boutique ↔ Fournisseur
- Espace fournisseur séparé (interface dédiée)
- Le fournisseur crée un compte fournisseur VENDIX
- Échange de bons de commande directement dans le chat
- Partage catalogue fournisseur (PDF, photos)
- Historique des échanges commerciaux

### 5.3 Réponses Rapides (Templates)
- Messages pré-enregistrés : "Commande reçue, merci !", "Livraison dans 30min", etc.
- Variables automatiques : {{nom_client}}, {{numéro_commande}}, {{montant}}
- Catalogue de réponses par catégorie

---

## MODULE 6 — GESTION FOURNISSEURS

### 6.1 Répertoire Fournisseurs
- Fiche complète : nom, contact, produits fournis, conditions
- Historique des achats par fournisseur
- Délai de livraison moyen, fiabilité (notes)
- Documents : contrats, tarifs, bons de commande (stockés dans l'app)

### 6.2 Bons de Commande Fournisseur
- Création bon de commande depuis l'app
- Envoi au fournisseur via messagerie VENDIX ou email PDF
- Suivi statut : Envoyé → Confirmé → En route → Réceptionné
- Réception partielle gérée
- Lien automatique entre bon de commande et mise à jour stock

### 6.3 Tarifs & Marges
- Prix d'achat enregistré par fournisseur
- Calcul marge automatique sur chaque produit
- Comparaison fournisseurs pour un même produit

---

## MODULE 7 — STATISTIQUES & RAPPORTS

### 7.1 Tableau de Bord Principal
- Chiffre d'affaires aujourd'hui / semaine / mois
- Nombre commandes en cours
- Meilleurs produits du jour
- Clients actifs
- Graphiques courbes, barres, camembert

### 7.2 Rapports Détaillés
- Rapport ventes par période (export PDF/Excel)
- Rapport par produit : quantité vendue, revenu, stock restant
- Rapport par client : fidélité, historique
- Rapport fournisseur : achats, dépenses
- Rapport stock : valorisation, rotation, ruptures

### 7.3 Prévisions (Phase 2)
- Prédiction rupture de stock basée sur vélocité de vente
- Suggestion de réassort
- Périodes de forte demande

---

## MODULE 8 — GESTION ÉQUIPE

### 8.1 Multi-Utilisateurs
- Inviter des employés (caissier, livreur, gestionnaire)
- Rôles et permissions :
  - **Propriétaire** — accès total
  - **Manager** — tout sauf paramètres compte
  - **Caissier** — commandes et clients uniquement
  - **Livreur** — voir les livraisons assignées uniquement

### 8.2 Journal d'Activité
- Qui a fait quoi, quand (audit trail)
- Connexions, modifications, annulations

---

## MODULE 9 — PAIEMENTS & FINANCES

### 9.1 Suivi Paiements
- Commande marquée : Payé / Non payé / Partiel
- Mode de paiement : espèce, mobile money, virement, carte
- Reçu paiement généré automatiquement
- Suivi des créances (clients qui doivent)
- Rappel de paiement automatique

### 9.2 Caisse Journalière
- Résumé des encaissements du jour
- Clôture de caisse (rapport fin de journée)
- Différence entre commandes et encaissements réels

### 9.3 Intégrations Paiement (Phase 2)
- Wave (Afrique de l'Ouest)
- Orange Money
- MTN Mobile Money
- CinetPay
- Stripe (cartes internationales)

---

## MODULE 10 — PARAMÈTRES & COMPTE

### 10.1 Profil Boutique
- Informations légales (NIF, RCCM, etc.)
- Coordonnées, réseaux sociaux
- Politique livraison, zones de livraison, frais
- Politique retour/remboursement
- Jours et horaires d'ouverture

### 10.2 Notifications
- Choisir quelles alertes recevoir (push, email, SMS)
- Heures de silence (ne pas déranger)

### 10.3 Sauvegarde & Sécurité
- Export complet des données (JSON, Excel)
- Sauvegarde automatique cloud
- 2FA (double authentification)
- Déconnexion à distance

### 10.4 Plans Tarifaires
- **Starter** — 1 boutique, 100 commandes/mois, 50 produits, 1 utilisateur (Gratuit)
- **Pro** — boutique illimitée, commandes illimitées, 500 produits, 3 utilisateurs
- **Business** — multi-boutiques, stocks avancés, fournisseurs, 10 utilisateurs
- **Enterprise** — sur mesure, API, intégrations custom

---

## Fonctionnalités Différenciantes vs WhatsApp Business

| Fonctionnalité | WhatsApp Business | VENDIX |
|---|---|---|
| Catalogue produits | Basique (10 images) | Illimité, variantes, stock |
| Gestion commandes | 0 (dans les messages) | Module complet |
| Reçus/Factures | 0 | PDF automatiques |
| Gestion stock | 0 | Temps réel |
| Gestion fournisseurs | 0 | Module dédié |
| Statistiques | 0 | Dashboards complets |
| Multi-utilisateurs | 0 | Rôles et permissions |
| Données perdues si ban | Oui (tout perdu) | Non (cloud sécurisé) |
| Client besoin de WhatsApp | Oui | Non (lien ou QR) |
| Messagerie | Oui | Oui (intégrée) |
| Paiement intégré | Non | Oui (Phase 2) |
| Backup données | Non | Automatique |
| SEO / Google | Non | Oui |
| Fidélisation | Non | Oui |
| Numéro téléphone requis | Oui | Non |
