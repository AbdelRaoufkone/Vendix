import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authenticate, AuthRequest } from '../middleware/auth.middleware'
import { AppError } from '../middleware/error.middleware'

export const paymentRouter = Router()

const createPaymentSchema = z.object({
  orderId: z.string(),
  amount: z.number().positive(),
  method: z.enum(['CASH', 'WAVE', 'ORANGE_MONEY', 'MTN_MOMO', 'BANK_TRANSFER', 'CARD', 'OTHER']),
  reference: z.string().optional(),
  note: z.string().optional(),
})

// POST /api/payments — enregistrer un paiement
paymentRouter.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const data = createPaymentSchema.parse(req.body)

    const order = await prisma.order.findUnique({
      where: { id: data.orderId },
      include: { boutique: { select: { ownerId: true } } },
    })
    if (!order) throw new AppError('Commande introuvable', 404)

    // Vérifier que l'utilisateur est propriétaire de la boutique
    if (order.boutique.ownerId !== req.user!.id) {
      throw new AppError('Accès refusé', 403)
    }

    if (order.paymentStatus === 'PAID') {
      throw new AppError('Cette commande est déjà entièrement payée', 409)
    }

    const result = await prisma.$transaction(async (tx) => {
      // Créer le paiement
      const payment = await tx.payment.create({
        data: {
          orderId: data.orderId,
          amount: data.amount,
          method: data.method,
          reference: data.reference,
          note: data.note,
        },
      })

      // Recalculer le montant payé
      const payments = await tx.payment.findMany({
        where: { orderId: data.orderId },
        select: { amount: true },
      })
      const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0)
      const orderTotal = Number(order.total)

      let paymentStatus: 'UNPAID' | 'PARTIAL' | 'PAID'
      if (totalPaid <= 0) {
        paymentStatus = 'UNPAID'
      } else if (totalPaid >= orderTotal) {
        paymentStatus = 'PAID'
      } else {
        paymentStatus = 'PARTIAL'
      }

      // Mettre à jour la commande
      const updatedOrder = await tx.order.update({
        where: { id: data.orderId },
        data: {
          paidAmount: totalPaid,
          paymentStatus,
          paymentMethod: data.method,
        },
      })

      return { payment, order: updatedOrder }
    })

    res.status(201).json({ success: true, payment: result.payment, order: result.order })
  } catch (e) {
    next(e)
  }
})

// GET /api/payments?orderId=xxx — liste des paiements d'une commande
paymentRouter.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { orderId } = req.query as Record<string, string>
    if (!orderId) throw new AppError('orderId requis', 400)

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { boutique: { select: { ownerId: true } } },
    })
    if (!order) throw new AppError('Commande introuvable', 404)

    if (order.boutique.ownerId !== req.user!.id) {
      throw new AppError('Accès refusé', 403)
    }

    const payments = await prisma.payment.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    })

    res.json({ success: true, payments })
  } catch (e) {
    next(e)
  }
})
