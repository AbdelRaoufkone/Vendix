# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**VENDIX** is a commerce platform that replaces WhatsApp Business for merchants. Each merchant gets a public storefront URL (`/boutique/[slug]`) + QR code. Clients order via browser (no app needed). The platform handles orders, inventory, customers, suppliers, receipts, and real-time messaging.

Monorepo with two independent apps — always `cd` into the correct one before running commands.

---

## Commands

### Backend (`app/backend/`)

```bash
# Development (hot reload via tsx)
npm run dev

# Database
npm run db:generate    # regenerate Prisma client after schema changes
npm run db:push        # push schema to DB without migration (dev only)
npm run db:migrate     # create and run a migration (production-safe)
npm run db:studio      # open Prisma Studio GUI

# Build / Production
npm run build          # compile TypeScript to dist/
npm start              # run compiled output
```

> Requires a `.env` from `.env.example`: `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `FRONTEND_URL`, and optionally Cloudinary/SMTP/Twilio keys.

### Frontend (`app/frontend/`)

```bash
npm run dev      # Next.js dev server on :3000
npm run build    # production build (also validates PWA manifest)
npm run lint     # ESLint
```

> Requires `.env.local` with `NEXT_PUBLIC_API_URL=http://localhost:5000`.

---

## Architecture

### Backend

**Entry point:** `src/index.ts` — creates Express app + HTTP server + Socket.io instance, registers all routers, then exports `io` for use in route handlers.

**Request flow:** `rateLimiter` → router → `authenticate` middleware (JWT) → route handler → `AppError` or response → `errorHandler` (last middleware).

**Auth pattern:** Access token (15min JWT) + Refresh token (30d JWT stored in DB). The `authenticate` middleware attaches `req.user = { id, role }`. Route handlers call `requireRole(...)` for RBAC.

**Error handling:** Throw `new AppError(message, statusCode)` anywhere in a route — the catch block passes it to `next(e)`, and `errorHandler` formats the JSON response uniformly.

**Real-time:** Socket.io handlers live in `src/socket/chat.socket.ts`. Merchants join room `boutique:{boutiqueId}` to receive live order and message events. Conversations use room `conv:{conversationId}`. The `io` instance is imported from `src/index.ts` in route files that need to emit events (e.g., `order.routes.ts` emits `order:new` on creation).

**Database:** Single Prisma client singleton in `src/lib/prisma.ts` (prevents connection pool exhaustion in dev). After any schema change, run `db:generate` before the server will compile.

**Key data relationships:**
- `User` → owns many `Boutique`
- `Boutique` → has `Product[]`, `Order[]`, `CustomerProfile[]`, `Supplier[]`, `Conversation[]`
- `Order` → has `OrderItem[]` (price/name snapshotted at creation), `Payment[]`, `OrderStatusLog[]`, optional `Receipt`
- `Conversation` → belongs to either a `CustomerProfile` or `Supplier` (never both)
- Stock is decremented transactionally when an order is confirmed (`order.routes.ts` `$transaction`)

### Frontend

**Framework:** Next.js 14 App Router. All dashboard pages are under `src/app/(dashboard)/` (protected). Public boutique pages are `src/app/boutique/[slug]/page.tsx` (SSR with revalidation for SEO).

**API client:** `src/lib/api.ts` — Axios instance with base URL from `NEXT_PUBLIC_API_URL`. Automatically injects `Authorization: Bearer` from `localStorage`. Interceptor handles 401 → refresh token → retry transparently.

**Socket client:** `src/lib/socket.ts` — lazy singleton. Call `getSocket()` to get (or create) the Socket.io connection. Components must call `socket.off(event)` on unmount to avoid duplicate listeners.

**State:**
- Server state → React Query (`useQuery` / `useMutation`). Cache key conventions: `['boutique', slug]`, `['orders', 'recent']`, `['messages', conversationId]`.
- Cart → Zustand + `persist` middleware (localStorage key: `vendix-cart`).

**PWA:** Configured via `next-pwa` in `next.config.js`. Service worker is disabled in dev. The `public/manifest.json` defines the installable PWA metadata. Safe area CSS utilities (`safe-bottom`, `safe-top`) handle iPhone notch.

**Public boutique flow:** `BoutiquePublicView` fetches boutique data → renders product grid → cart state in Zustand → `OrderModal` POSTs to `/api/orders` (unauthenticated endpoint) with customer name/phone inline.

### Validation

Zod schemas are defined inline in each route file (backend) and in form files (frontend). The same `zod` package is used on both sides — if you need shared schemas, co-locate them or duplicate deliberately (no shared package currently).

---

## Key Conventions

- **All API responses** follow `{ success: boolean, data... }` — use `success: true` with the resource, or throw `AppError` for errors.
- **Order numbers** are `VDX-YYYY-NNNNN`, receipt numbers `REC-YYYY-NNNNN`, purchase orders `PO-YYYY-NNNNN` — generated in `src/lib/utils.ts`.
- **Soft deletes:** Products use `isActive: false` instead of deletion. Never hard-delete products (order history references them).
- **Stock operations** must use Prisma transactions (`$transaction`) to prevent race conditions.
- **Currency** defaults to XOF (West African CFA franc). The `formatCurrency` util in `src/lib/format.ts` handles locale formatting.
- **Multi-tenant isolation:** Every query that touches boutique data must filter by `boutiqueId`. Verify the authenticated user owns the boutique before returning data.
