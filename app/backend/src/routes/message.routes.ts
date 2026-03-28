import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, AuthRequest } from '../middleware/auth.middleware'
import { AppError } from '../middleware/error.middleware'

export const messageRouter = Router()

// GET /api/messages/conversations — liste des conversations d'une boutique
messageRouter.get('/conversations', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { boutiqueId } = req.query as { boutiqueId: string }
    if (!boutiqueId) throw new AppError('boutiqueId requis', 400)

    const conversations = await prisma.conversation.findMany({
      where: { boutiqueId },
      include: {
        customer: { select: { name: true, phone: true } },
        supplier: { select: { name: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { content: true, createdAt: true, senderType: true },
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    })

    res.json({ success: true, conversations })
  } catch (e) { next(e) }
})

// GET /api/messages/conversations/:id/messages — messages d'une conversation
messageRouter.get('/conversations/:id/messages', authenticate, async (req, res, next) => {
  try {
    const { page = '1', limit = '50' } = req.query as Record<string, string>

    const messages = await prisma.message.findMany({
      where: { conversationId: req.params.id },
      orderBy: { createdAt: 'asc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    })

    // Marquer comme lus (côté commerçant)
    await prisma.message.updateMany({
      where: {
        conversationId: req.params.id,
        senderType: { not: 'MERCHANT' },
        readAt: null,
      },
      data: { readAt: new Date() },
    })

    // Reset unreadCount
    await prisma.conversation.update({
      where: { id: req.params.id },
      data: { unreadCount: 0 },
    })

    res.json({ success: true, messages })
  } catch (e) { next(e) }
})

// POST /api/messages/conversations — créer ou récupérer une conversation (côté client)
messageRouter.post('/conversations', async (req, res, next) => {
  try {
    const { boutiqueId, customer: customerData } = req.body
    const customerName = customerData?.name
    const customerPhone = customerData?.phone
    const customerEmail = customerData?.email

    if (!boutiqueId) throw new AppError('boutiqueId requis', 400)
    if (!customerName) throw new AppError('Le nom du client est requis', 400)

    // Trouver ou créer le profil client
    let customer = await prisma.customerProfile.findFirst({
      where: {
        boutiqueId,
        OR: [
          ...(customerPhone ? [{ phone: customerPhone }] : []),
          ...(customerEmail ? [{ email: customerEmail }] : []),
        ],
      },
    })

    if (!customer) {
      customer = await prisma.customerProfile.create({
        data: { boutiqueId, name: customerName, phone: customerPhone, email: customerEmail },
      })
    }

    // Trouver ou créer la conversation
    let conversation = await prisma.conversation.findFirst({
      where: { boutiqueId, customerId: customer.id },
    })

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: { boutiqueId, customerId: customer.id },
      })
    }

    res.json({ success: true, conversation, customer })
  } catch (e) { next(e) }
})
