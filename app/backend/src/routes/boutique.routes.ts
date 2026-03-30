import { Router } from 'express'
import { z } from 'zod'
import QRCode from 'qrcode'
import { prisma } from '../lib/prisma'
import { authenticate, AuthRequest } from '../middleware/auth.middleware'
import { AppError } from '../middleware/error.middleware'

export const boutiqueRouter = Router()

const createBoutiqueSchema = z.object({
  name: z.string().min(2).max(60),
  slug: z.string().min(2).max(40).regex(/^[a-z0-9-]+$/, 'Slug invalide (lettres, chiffres, tirets)'),
  description: z.string().max(500).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
})

// GET /api/boutiques/public/:slug — page publique (sans auth)
boutiqueRouter.get('/public/:slug', async (req, res, next) => {
  try {
    const boutique = await prisma.boutique.findUnique({
      where: { slug: req.params.slug, isActive: true },
      include: {
        products: {
          where: { isActive: true },
          include: { category: true, variants: true },
          orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
        },
        categories: true,
        settings: true,
      },
    })
    if (!boutique) throw new AppError('Boutique introuvable', 404)

    // Ne pas exposer les données privées
    const { ownerId, employees, ...publicData } = boutique as any
    res.json({ success: true, boutique: publicData })
  } catch (e) {
    next(e)
  }
})

// GET /api/boutiques/public/:slug/qr — QR code de la boutique
boutiqueRouter.get('/public/:slug/qr', async (req, res, next) => {
  try {
    const boutique = await prisma.boutique.findUnique({
      where: { slug: req.params.slug },
      select: { name: true },
    })
    if (!boutique) throw new AppError('Boutique introuvable', 404)

    const url = `${process.env.FRONTEND_URL}/boutique/${req.params.slug}`
    const qr = await QRCode.toDataURL(url, { width: 400, margin: 2 })
    res.json({ success: true, qr, url })
  } catch (e) {
    next(e)
  }
})

// POST /api/boutiques — créer une boutique
boutiqueRouter.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const data = createBoutiqueSchema.parse(req.body)
    const exists = await prisma.boutique.findUnique({ where: { slug: data.slug } })
    if (exists) throw new AppError('Ce nom de boutique est déjà pris', 409)

    const boutique = await prisma.boutique.create({
      data: {
        ...data,
        ownerId: req.user!.id,
        settings: { create: {} },
      },
    })

    res.status(201).json({ success: true, boutique })
  } catch (e) {
    next(e)
  }
})

// GET /api/boutiques/mine — mes boutiques
boutiqueRouter.get('/mine', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const boutiques = await prisma.boutique.findMany({
      where: { ownerId: req.user!.id },
      include: {
        _count: { select: { products: true, orders: true, customers: true } },
      },
    })
    res.json({ success: true, boutiques })
  } catch (e) {
    next(e)
  }
})

const updateBoutiqueSchema = z.object({
  name: z.string().min(2).max(60).optional(),
  slug: z.string().min(2).max(40).regex(/^[a-z0-9-]+$/, 'Slug invalide').optional(),
  description: z.string().max(500).nullable().optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  logo: z.string().nullable().optional(),
  banner: z.string().nullable().optional(),
  banners: z.array(z.string()).optional(),
  themeColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Couleur invalide (format #RRGGBB)').optional(),
})

// PATCH /api/boutiques/:id — modifier la boutique
boutiqueRouter.patch('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const boutique = await prisma.boutique.findFirst({
      where: { id: req.params.id, ownerId: req.user!.id },
    })
    if (!boutique) throw new AppError('Boutique introuvable', 404)

    const data = updateBoutiqueSchema.parse(req.body)
    const updated = await prisma.boutique.update({
      where: { id: req.params.id },
      data,
    })
    res.json({ success: true, boutique: updated })
  } catch (e) {
    next(e)
  }
})

const updateSettingsSchema = z.object({
  currency: z.string().min(1).max(10).optional(),
  taxRate: z.number().min(0).max(100).optional(),
  lowStockThreshold: z.number().int().min(0).optional(),
  autoConfirmOrders: z.boolean().optional(),
  loyaltyPointRate: z.number().int().min(0).optional(),
  notifEmail: z.boolean().optional(),
  notifSms: z.boolean().optional(),
  notifPush: z.boolean().optional(),
  contactEmail: z.string().email().nullable().optional(),
})

// PATCH /api/boutiques/:id/settings — mettre à jour les paramètres boutique
boutiqueRouter.patch('/:id/settings', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const boutique = await prisma.boutique.findFirst({
      where: { id: req.params.id, ownerId: req.user!.id },
    })
    if (!boutique) throw new AppError('Boutique introuvable', 404)

    const data = updateSettingsSchema.parse(req.body)

    const settings = await prisma.boutiqueSettings.upsert({
      where: { boutiqueId: req.params.id },
      create: { boutiqueId: req.params.id, ...data },
      update: data,
    })

    res.json({ success: true, settings })
  } catch (e) {
    next(e)
  }
})
