# VENDIX — Architecture Technique

---

## Stack Technologique

### Frontend — PWA
| Technologie | Rôle | Pourquoi |
|---|---|---|
| **Next.js 14** (App Router) | Framework React SSR/SSG | SEO natif, performance, routing, API routes |
| **TypeScript** | Langage | Type safety, moins de bugs |
| **Tailwind CSS** | Styling | Rapidité, design system cohérent |
| **shadcn/ui** | Composants UI | Composants accessibles et modernes |
| **PWA** (next-pwa) | Progressive Web App | Installation home screen, offline, push |
| **Socket.io Client** | Temps réel | Chat et notifications live |
| **React Query** | Data fetching | Cache, sync, mutations |
| **Zustand** | State management | Léger, simple |
| **React Hook Form + Zod** | Formulaires | Validation robuste |

### Backend — API
| Technologie | Rôle | Pourquoi |
|---|---|---|
| **Node.js + Express** | Serveur API REST | Performant, ecosystème riche |
| **Prisma ORM** | Accès base de données | Type-safe, migrations faciles |
| **PostgreSQL** | Base de données principale | Relations complexes, fiable |
| **Socket.io** | WebSockets | Chat temps réel |
| **Redis** | Cache + sessions + queues | Performance, sessions utilisateurs |
| **BullMQ** | Queue de jobs | Notifications, emails async |
| **JWT + Refresh Token** | Authentification | Sécurisé, stateless |
| **Bcrypt** | Hashage mots de passe | Sécurité |
| **Zod** | Validation inputs | Partagé frontend/backend |

### Services Externes
| Service | Usage |
|---|---|
| **Cloudinary** | Stockage images produits et documents |
| **Nodemailer + SMTP** | Envoi emails (reçus, notifications) |
| **Twilio / Africa's Talking** | SMS OTP, notifications SMS |
| **PDFKit / Puppeteer** | Génération factures PDF |
| **QRCode.js** | Génération QR codes |

### Infrastructure (MVP)
| Composant | Service |
|---|---|
| Frontend | Vercel (gratuit pour commencer) |
| Backend API | Railway ou Render |
| Base de données | Supabase (PostgreSQL managé) |
| Redis | Upstash (Redis serverless) |
| Images | Cloudinary (free tier) |
| Domaine | vendix.app |

---

## Architecture Haut Niveau

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT (Browser/PWA)                  │
│          Next.js 14 — TypeScript — Tailwind             │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Dashboard    │  │ Boutique     │  │ Chat         │  │
│  │ Commerçant   │  │ Publique     │  │ Intégré      │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
└─────────┼─────────────────┼─────────────────┼───────────┘
          │                 │                 │
          │   HTTPS/REST    │    WebSocket    │
          ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────┐
│                   API SERVER (Node.js)                   │
│                                                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │ Auth     │ │ Boutique │ │ Orders   │ │ Chat     │   │
│  │ Router   │ │ Router   │ │ Router   │ │ Socket   │   │
│  └─────┬────┘ └─────┬────┘ └─────┬────┘ └─────┬────┘   │
│        │            │            │             │         │
│  ┌─────▼────────────▼────────────▼─────────────▼────┐   │
│  │              Middleware Layer                      │   │
│  │  Auth JWT | Validation Zod | Rate Limit | Logger  │   │
│  └─────────────────────┬──────────────────────────────┘   │
│                        │                                  │
│  ┌─────────────────────▼──────────────────────────────┐  │
│  │              Service Layer                          │  │
│  │  OrderService | InventoryService | ChatService...  │  │
│  └─────────────────────┬──────────────────────────────┘  │
└────────────────────────┼───────────────────────────────-─┘
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
   ┌─────────────┐ ┌──────────┐ ┌──────────────┐
   │ PostgreSQL  │ │  Redis   │ │  Cloudinary  │
   │ (Prisma)   │ │  Cache   │ │  (Images)    │
   └─────────────┘ └──────────┘ └──────────────┘
          │
   ┌──────▼──────┐
   │  BullMQ     │ ──→ Email (Nodemailer)
   │  Job Queue  │ ──→ SMS (Africa's Talking)
   └─────────────┘ ──→ PDF (PDFKit)
```

---

## Modèle de Données (Prisma Schema — résumé)

```prisma
model User {
  id          String   @id @default(cuid())
  email       String   @unique
  phone       String?
  password    String
  role        Role     // MERCHANT | CUSTOMER | SUPPLIER | ADMIN
  boutiques   Boutique[]
  createdAt   DateTime @default(now())
}

model Boutique {
  id          String   @id @default(cuid())
  slug        String   @unique      // vendix.app/boutique/[slug]
  name        String
  description String?
  logo        String?               // Cloudinary URL
  ownerId     String
  owner       User     @relation(...)
  products    Product[]
  orders      Order[]
  customers   Customer[]
  employees   Employee[]
  settings    BoutiqueSettings?
}

model Product {
  id          String   @id @default(cuid())
  boutiqueId  String
  name        String
  description String?
  images      String[]              // Cloudinary URLs
  price       Decimal
  costPrice   Decimal?              // Prix d'achat fournisseur
  stock       Int      @default(0)
  lowStockAt  Int      @default(5)
  variants    Variant[]
  category    Category @relation(...)
  isActive    Boolean  @default(true)
}

model Order {
  id          String      @id @default(cuid())
  number      String      @unique    // ex: VDX-2024-00142
  boutiqueId  String
  customerId  String
  items       OrderItem[]
  status      OrderStatus // PENDING | CONFIRMED | PREPARING | READY | DELIVERED | CANCELLED
  total       Decimal
  paidAmount  Decimal     @default(0)
  paymentStatus PaymentStatus
  deliveryAddress String?
  notes       String?
  receipt     Receipt?
  createdAt   DateTime    @default(now())
}

model Message {
  id          String   @id @default(cuid())
  roomId      String                // conversationId
  senderId    String
  senderType  SenderType           // MERCHANT | CUSTOMER | SUPPLIER
  content     String
  type        MessageType          // TEXT | IMAGE | ORDER | RECEIPT
  metadata    Json?                // lien order, lien reçu, etc.
  readAt      DateTime?
  createdAt   DateTime @default(now())
}

model Supplier {
  id          String   @id @default(cuid())
  boutiqueId  String
  name        String
  contact     String
  userId      String?              // Si le fournisseur a un compte VENDIX
  purchases   PurchaseOrder[]
}
```

---

## Structure des Dossiers (app/)

```
app/
├── frontend/
│   ├── src/
│   │   ├── app/                        # Next.js App Router
│   │   │   ├── (auth)/                 # Login, Register
│   │   │   ├── (dashboard)/            # Espace commerçant
│   │   │   │   ├── dashboard/
│   │   │   │   ├── commandes/
│   │   │   │   ├── produits/
│   │   │   │   ├── clients/
│   │   │   │   ├── fournisseurs/
│   │   │   │   ├── stocks/
│   │   │   │   ├── messages/
│   │   │   │   ├── statistiques/
│   │   │   │   └── parametres/
│   │   │   ├── boutique/
│   │   │   │   └── [slug]/             # Page publique boutique
│   │   │   └── api/                    # API Routes Next.js (légères)
│   │   ├── components/
│   │   │   ├── ui/                     # shadcn/ui components
│   │   │   ├── dashboard/
│   │   │   ├── boutique/
│   │   │   └── chat/
│   │   ├── hooks/
│   │   ├── lib/
│   │   │   ├── api.ts                  # Client API
│   │   │   ├── socket.ts               # Socket.io client
│   │   │   └── utils.ts
│   │   ├── store/                      # Zustand stores
│   │   └── types/
│   ├── public/
│   │   ├── manifest.json               # PWA manifest
│   │   └── sw.js                       # Service Worker
│   ├── next.config.js
│   ├── tailwind.config.ts
│   └── package.json
│
└── backend/
    ├── src/
    │   ├── routes/
    │   │   ├── auth.routes.ts
    │   │   ├── boutique.routes.ts
    │   │   ├── product.routes.ts
    │   │   ├── order.routes.ts
    │   │   ├── customer.routes.ts
    │   │   ├── supplier.routes.ts
    │   │   ├── message.routes.ts
    │   │   └── stats.routes.ts
    │   ├── services/
    │   ├── middleware/
    │   ├── socket/
    │   │   └── chat.socket.ts
    │   ├── jobs/
    │   │   ├── notification.job.ts
    │   │   ├── email.job.ts
    │   │   └── pdf.job.ts
    │   ├── lib/
    │   └── index.ts
    ├── prisma/
    │   ├── schema.prisma
    │   └── migrations/
    └── package.json
```

---

## Sécurité

- HTTPS obligatoire (Vercel/Railway le gèrent)
- JWT avec expiration courte + Refresh Token rotation
- Rate limiting sur toutes les routes publiques
- Validation stricte Zod sur tous les inputs
- CORS configuré précisément
- Sanitisation HTML pour les contenus texte
- Upload fichiers : vérification type MIME + taille limite
- Row-level security : un commerçant ne voit que ses données

---

## Phases de Développement

### Phase 1 — MVP (2-3 mois)
- Auth (inscription, connexion, profil)
- Boutique publique (catalogue, commande client simple)
- Dashboard commandes
- Reçus PDF basiques
- Chat client ↔ boutique
- Notifications push

### Phase 2 — Core Business (2 mois)
- Gestion stocks complète
- Gestion fournisseurs
- Statistiques et rapports
- Programme fidélité
- Multi-utilisateurs

### Phase 3 — Croissance (2 mois)
- Intégrations paiement mobile (Wave, OM, MTN MoMo)
- Marketplace (les boutiques VENDIX visibles sur une page d'accueil)
- App mobile native (si traction prouvée)
- API publique pour intégrations tierces
