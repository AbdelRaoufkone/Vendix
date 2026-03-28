import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authenticate, AuthRequest } from '../middleware/auth.middleware'
import { AppError } from '../middleware/error.middleware'
import { generatePurchaseOrderNumber } from '../lib/utils'

export const supplierRouter = Router()

supplierRouter.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { boutiqueId } = req.query as { boutiqueId: string }
    if (!boutiqueId) throw new AppError('boutiqueId requis', 400)

    const suppliers = await prisma.supplier.findMany({
      where: { boutiqueId },
      include: { _count: { select: { purchaseOrders: true } } },
    })
    res.json({ success: true, suppliers })
  } catch (e) { next(e) }
})

supplierRouter.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { boutiqueId, name, phone, email, address, notes } = req.body
    const supplier = await prisma.supplier.create({
      data: { boutiqueId, name, phone, email, address, notes },
    })
    res.status(201).json({ success: true, supplier })
  } catch (e) { next(e) }
})

// Bons de commande fournisseur
supplierRouter.post('/:id/purchase-orders', authenticate, async (req, res, next) => {
  try {
    const { boutiqueId, items, notes, expectedAt } = req.body
    const number = await generatePurchaseOrderNumber()

    const total = items.reduce((sum: number, i: any) => sum + i.unitCost * i.quantity, 0)

    const po = await prisma.purchaseOrder.create({
      data: {
        number,
        boutiqueId,
        supplierId: req.params.id,
        total,
        notes,
        expectedAt: expectedAt ? new Date(expectedAt) : null,
        items: {
          create: items.map((i: any) => ({
            productId: i.productId,
            productName: i.productName,
            quantity: i.quantity,
            orderedQty: i.quantity,
            unitCost: i.unitCost,
            total: i.unitCost * i.quantity,
          })),
        },
      },
      include: { items: true, supplier: true },
    })

    res.status(201).json({ success: true, purchaseOrder: po })
  } catch (e) { next(e) }
})

// Réceptionner une commande fournisseur
supplierRouter.patch('/purchase-orders/:id/receive', authenticate, async (req, res, next) => {
  try {
    const { items } = req.body // [{ purchaseItemId, receivedQty }]

    await prisma.$transaction(async (tx) => {
      for (const item of items) {
        const pi = await tx.purchaseItem.update({
          where: { id: item.purchaseItemId },
          data: { receivedQty: item.receivedQty },
        })
        // Mettre à jour le stock produit
        if (pi.productId) {
          await tx.product.update({
            where: { id: pi.productId },
            data: { stock: { increment: item.receivedQty } },
          })
        }
      }

      await tx.purchaseOrder.update({
        where: { id: req.params.id },
        data: { status: 'RECEIVED', receivedAt: new Date() },
      })
    })

    res.json({ success: true })
  } catch (e) { next(e) }
})
