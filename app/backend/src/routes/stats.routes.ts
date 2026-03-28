import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, AuthRequest } from '../middleware/auth.middleware'
import { AppError } from '../middleware/error.middleware'

export const statsRouter = Router()

statsRouter.get('/summary', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { boutiqueId } = req.query as { boutiqueId: string }
    if (!boutiqueId) throw new AppError('boutiqueId requis', 400)

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [todayOrders, pendingOrders, lowStockProducts, unreadMessages, activeCustomers] =
      await Promise.all([
        prisma.order.aggregate({
          where: { boutiqueId, createdAt: { gte: today }, status: { not: 'CANCELLED' } },
          _sum: { total: true },
          _count: true,
        }),
        prisma.order.count({
          where: { boutiqueId, status: { in: ['PENDING', 'CONFIRMED', 'PREPARING'] } },
        }),
        prisma.product.count({
          where: { boutiqueId, isActive: true, stock: { lte: 5 } },
        }),
        prisma.conversation.aggregate({
          where: { boutiqueId },
          _sum: { unreadCount: true },
        }),
        prisma.customerProfile.count({
          where: { boutiqueId, orders: { some: { createdAt: { gte: new Date(Date.now() - 30 * 86400000) } } } },
        }),
      ])

    res.json({
      success: true,
      todayRevenue: Number(todayOrders._sum.total ?? 0),
      todayOrders: todayOrders._count,
      pendingOrders,
      lowStockProducts,
      unreadMessages: unreadMessages._sum.unreadCount ?? 0,
      activeCustomers,
    })
  } catch (e) { next(e) }
})

statsRouter.get('/revenue', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { boutiqueId, period = '7d' } = req.query as { boutiqueId: string; period: string }
    if (!boutiqueId) throw new AppError('boutiqueId requis', 400)

    const days = period === '30d' ? 30 : period === '90d' ? 90 : 7
    const from = new Date(Date.now() - days * 86400000)

    const orders = await prisma.order.findMany({
      where: { boutiqueId, createdAt: { gte: from }, status: { not: 'CANCELLED' } },
      select: { total: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    })

    // Grouper par jour
    const grouped: Record<string, number> = {}
    for (let i = 0; i < days; i++) {
      const d = new Date(Date.now() - (days - 1 - i) * 86400000)
      const key = d.toISOString().split('T')[0]
      grouped[key] = 0
    }
    orders.forEach(o => {
      const key = o.createdAt.toISOString().split('T')[0]
      if (grouped[key] !== undefined) grouped[key] += Number(o.total)
    })

    const data = Object.entries(grouped).map(([date, revenue]) => ({ date, revenue }))
    res.json({ success: true, data })
  } catch (e) { next(e) }
})
