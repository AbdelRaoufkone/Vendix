import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authenticate, AuthRequest } from '../middleware/auth.middleware'
import { AppError } from '../middleware/error.middleware'

export const customerRouter = Router()

customerRouter.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { boutiqueId, search, page = '1', limit = '50' } = req.query as Record<string, string>
    if (!boutiqueId) throw new AppError('boutiqueId requis', 400)

    const customers = await prisma.customerProfile.findMany({
      where: {
        boutiqueId,
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      include: {
        orders: {
          select: { total: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    })

    // Compute ordersCount + totalSpent for each customer
    const enriched = customers.map(c => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email,
      tags: c.tags,
      notes: c.notes,
      loyaltyPoints: c.loyaltyPoints,
      createdAt: c.createdAt,
      ordersCount: c.orders.length,
      totalSpent: c.orders.reduce((sum, o) => sum + Number(o.total), 0),
      lastOrderAt: c.orders[0]?.createdAt ?? null,
    }))

    res.json({ success: true, customers: enriched })
  } catch (e) { next(e) }
})

customerRouter.get('/:id', authenticate, async (req, res, next) => {
  try {
    const customer = await prisma.customerProfile.findUnique({
      where: { id: req.params.id },
      include: {
        orders: {
          orderBy: { createdAt: 'desc' },
          include: { items: { select: { name: true, quantity: true, price: true } } },
        },
        addresses: true,
      },
    })
    if (!customer) throw new AppError('Client introuvable', 404)

    const enriched = {
      ...customer,
      ordersCount: customer.orders.length,
      totalSpent: customer.orders.reduce((sum, o) => sum + Number(o.total), 0),
      lastOrderAt: customer.orders[0]?.createdAt ?? null,
    }
    res.json({ success: true, customer: enriched })
  } catch (e) { next(e) }
})

customerRouter.patch('/:id', authenticate, async (req, res, next) => {
  try {
    const { notes, tags } = req.body
    const customer = await prisma.customerProfile.update({
      where: { id: req.params.id },
      data: { notes, tags },
    })
    res.json({ success: true, customer })
  } catch (e) { next(e) }
})

// POST /customers — créer un client manuellement
customerRouter.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const schema = z.object({
      boutiqueId: z.string(),
      name: z.string().min(1),
      phone: z.string().optional(),
      email: z.string().email().optional(),
      notes: z.string().optional(),
      tags: z.array(z.string()).optional(),
    })
    const data = schema.parse(req.body)

    const boutique = await prisma.boutique.findFirst({
      where: { id: data.boutiqueId, ownerId: req.user!.id },
      select: { id: true },
    })
    if (!boutique) throw new AppError('Boutique introuvable', 403)

    const customer = await prisma.customerProfile.create({
      data: {
        boutiqueId: data.boutiqueId,
        name: data.name,
        phone: data.phone,
        email: data.email,
        notes: data.notes,
        tags: data.tags ?? [],
      },
    })
    res.status(201).json({ success: true, customer })
  } catch (e) { next(e) }
})

// POST /customers/import — importer depuis CSV (array de clients)
customerRouter.post('/import', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { boutiqueId, customers } = req.body as {
      boutiqueId: string
      customers: Array<{ name: string; phone?: string; email?: string }>
    }
    if (!boutiqueId || !Array.isArray(customers)) throw new AppError('Données invalides', 400)

    const boutique = await prisma.boutique.findFirst({
      where: { id: boutiqueId, ownerId: req.user!.id },
      select: { id: true },
    })
    if (!boutique) throw new AppError('Boutique introuvable', 403)

    let created = 0
    let skipped = 0

    for (const c of customers) {
      if (!c.name?.trim()) continue

      // Skip duplicates by phone
      if (c.phone) {
        const exists = await prisma.customerProfile.findFirst({
          where: { boutiqueId, phone: c.phone },
        })
        if (exists) { skipped++; continue }
      }

      await prisma.customerProfile.create({
        data: { boutiqueId, name: c.name.trim(), phone: c.phone, email: c.email },
      })
      created++
    }

    res.json({ success: true, created, skipped })
  } catch (e) { next(e) }
})
