import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authenticate, AuthRequest } from '../middleware/auth.middleware'
import { AppError } from '../middleware/error.middleware'
import { generateOrderNumber, generateReceiptNumber } from '../lib/utils'
import { generateReceiptPDF } from '../services/receipt.service'
import { io } from '../index'

export const orderRouter = Router()

const createOrderSchema = z.object({
  boutiqueId: z.string(),
  customer: z.object({
    name: z.string(),
    phone: z.string().optional(),
    email: z.string().email().optional(),
    address: z.string().optional(),
  }),
  items: z.array(z.object({
    productId: z.string(),
    variantId: z.string().optional(),
    quantity: z.number().int().positive(),
  })),
  deliveryAddress: z.string().optional(),
  notes: z.string().optional(),
})

// POST /api/orders — créer une commande (public, côté client boutique)
orderRouter.post('/', async (req, res, next) => {
  try {
    const data = createOrderSchema.parse(req.body)

    // Récupérer ou créer le profil client
    let customer = await prisma.customerProfile.findFirst({
      where: {
        boutiqueId: data.boutiqueId,
        OR: [
          { phone: data.customer.phone },
          { email: data.customer.email },
        ].filter(c => Object.values(c)[0]),
      },
    })

    if (!customer) {
      customer = await prisma.customerProfile.create({
        data: {
          boutiqueId: data.boutiqueId,
          name: data.customer.name,
          phone: data.customer.phone,
          email: data.customer.email,
        },
      })
    }

    // Calculer les totaux
    let subtotal = 0
    const orderItems: Array<{ productId: string; variantId?: string; name: string; price: number; quantity: number; total: number }> = []

    for (const item of data.items) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } })
      if (!product) throw new AppError(`Produit introuvable: ${item.productId}`, 404)
      if (product.stock < item.quantity) throw new AppError(`Stock insuffisant: ${product.name}`, 400)

      const price = Number(product.promoPrice ?? product.price)
      const total = price * item.quantity
      subtotal += total

      orderItems.push({
        productId: item.productId,
        variantId: item.variantId,
        name: product.name,
        price,
        quantity: item.quantity,
        total,
      })
    }

    const number = await generateOrderNumber()

    // Créer la commande en transaction
    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          number,
          boutiqueId: data.boutiqueId,
          customerId: customer!.id,
          subtotal,
          total: subtotal,
          deliveryAddress: data.deliveryAddress ?? data.customer.address,
          notes: data.notes,
          items: { create: orderItems },
          statusHistory: { create: { status: 'PENDING' } },
        },
        include: { items: true, customer: true },
      })

      // Décrémenter le stock
      for (const item of data.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        })
      }

      return created
    })

    // Notifier le commerçant en temps réel
    io.to(`boutique:${data.boutiqueId}`).emit('order:new', order)

    res.status(201).json({ success: true, order })
  } catch (e) {
    next(e)
  }
})

// GET /api/orders?boutiqueId=xxx — liste commandes (commerçant)
orderRouter.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { boutiqueId, status, page = '1', limit = '20' } = req.query as Record<string, string>
    if (!boutiqueId) throw new AppError('boutiqueId requis', 400)

    const orders = await prisma.order.findMany({
      where: {
        boutiqueId,
        ...(status && { status: status as any }),
      },
      include: { customer: true, items: { include: { product: { select: { images: true } } } } },
      orderBy: { createdAt: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    })

    const total = await prisma.order.count({ where: { boutiqueId } })
    res.json({ success: true, orders, total, page: Number(page), limit: Number(limit) })
  } catch (e) {
    next(e)
  }
})

// PATCH /api/orders/:id/status — changer le statut
orderRouter.patch('/:id/status', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { status, note } = req.body
    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: {
        status,
        statusHistory: { create: { status, note, createdBy: req.user!.id } },
      },
      include: { customer: true },
    })

    // Notifier le commerçant
    io.to(`boutique:${order.boutiqueId}`).emit('order:updated', order)

    res.json({ success: true, order })
  } catch (e) {
    next(e)
  }
})

// GET /api/orders/:id — détail commande
orderRouter.get('/:id', authenticate, async (req, res, next) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        items: { include: { product: true } },
        customer: { include: { addresses: true } },
        payments: true,
        statusHistory: { orderBy: { createdAt: 'asc' } },
        receipt: true,
      },
    })
    if (!order) throw new AppError('Commande introuvable', 404)
    res.json({ success: true, order })
  } catch (e) {
    next(e)
  }
})

// POST /api/orders/:id/payments — enregistrer un paiement
orderRouter.post('/:id/payments', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const paymentSchema = z.object({
      amount: z.number().positive(),
      method: z.enum(['CASH', 'WAVE', 'ORANGE_MONEY', 'MTN_MOMO', 'BANK_TRANSFER', 'CARD', 'OTHER']),
      reference: z.string().optional(),
      note: z.string().optional(),
    })

    const data = paymentSchema.parse(req.body)

    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { boutique: { select: { ownerId: true } }, payments: true },
    })
    if (!order) throw new AppError('Commande introuvable', 404)
    if (order.boutique.ownerId !== req.user!.id) throw new AppError('Accès refusé', 403)

    const newPaidAmount = Number(order.paidAmount) + data.amount
    const paymentStatus =
      newPaidAmount >= Number(order.total) ? 'PAID' :
      newPaidAmount > 0 ? 'PARTIAL' : 'UNPAID'

    const [payment] = await prisma.$transaction([
      prisma.payment.create({
        data: {
          orderId: order.id,
          amount: data.amount,
          method: data.method,
          reference: data.reference,
          note: data.note,
        },
      }),
      prisma.order.update({
        where: { id: order.id },
        data: {
          paidAmount: newPaidAmount,
          paymentStatus,
          paymentMethod: data.method,
        },
      }),
    ])

    io.to(`boutique:${order.boutiqueId}`).emit('order:updated', { id: order.id, paymentStatus, paidAmount: newPaidAmount })

    res.status(201).json({ success: true, payment, paymentStatus, paidAmount: newPaidAmount })
  } catch (e) {
    next(e)
  }
})

// GET /api/orders/:id/receipt — télécharger le reçu PDF
orderRouter.get('/:id/receipt', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { boutique: { select: { ownerId: true } }, receipt: true },
    })
    if (!order) throw new AppError('Commande introuvable', 404)
    if (order.boutique.ownerId !== req.user!.id) throw new AppError('Accès refusé', 403)

    if (!order.receipt) {
      const number = await generateReceiptNumber()
      await prisma.receipt.create({ data: { orderId: order.id, number } })
    }

    const pdfBuffer = await generateReceiptPDF(order.id)
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="recu-${order.number}.pdf"`,
      'Content-Length': String(pdfBuffer.length),
    })
    res.end(pdfBuffer)
  } catch (e) {
    next(e)
  }
})

// POST /api/orders/:id/receipt — générer le reçu PDF (kept for compatibility)
orderRouter.post('/:id/receipt', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        boutique: { select: { ownerId: true } },
        receipt: true,
      },
    })
    if (!order) throw new AppError('Commande introuvable', 404)

    // Vérifier que l'utilisateur est propriétaire de la boutique
    if (order.boutique.ownerId !== req.user!.id) {
      throw new AppError('Accès refusé', 403)
    }

    // Créer le reçu en base s'il n'existe pas encore
    if (!order.receipt) {
      const number = await generateReceiptNumber()
      await prisma.receipt.create({
        data: {
          orderId: order.id,
          number,
        },
      })
    }

    const pdfBuffer = await generateReceiptPDF(order.id)

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="recu-${order.number}.pdf"`,
      'Content-Length': String(pdfBuffer.length),
    })
    res.end(pdfBuffer)
  } catch (e) {
    next(e)
  }
})
