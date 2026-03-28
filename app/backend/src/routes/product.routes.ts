import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authenticate, AuthRequest } from '../middleware/auth.middleware'
import { AppError } from '../middleware/error.middleware'

export const productRouter = Router()

// Valider que chaque image est bien un base64 JPEG/PNG et ne dépasse pas ~200KB
const base64ImageSchema = z.string()
  .refine(s => s.startsWith('data:image/'), 'Format base64 invalide')
  .refine(s => {
    const base = s.split(',')[1] ?? ''
    const sizeKB = Math.round((base.length * 3) / 4 / 1024)
    return sizeKB <= 200
  }, 'Image trop lourde (max 200KB après compression)')

const productSchema = z.object({
  boutiqueId: z.string(),
  categoryId: z.string().optional(),
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  images: z.array(base64ImageSchema).max(4, 'Maximum 4 images par produit').default([]),
  price: z.number().positive(),
  promoPrice: z.number().positive().optional(),
  promoEndsAt: z.string().datetime().optional(),
  costPrice: z.number().positive().optional(),
  stock: z.number().int().min(0).default(0),
  lowStockAt: z.number().int().min(0).default(5),
  sku: z.string().optional(),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
})

productRouter.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const data = productSchema.parse(req.body)
    const product = await prisma.product.create({ data, include: { variants: true, category: true } })
    res.status(201).json({ success: true, product })
  } catch (e) { next(e) }
})

productRouter.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { boutiqueId, search, categoryId, page = '1', limit = '20' } = req.query as Record<string, string>
    if (!boutiqueId) throw new AppError('boutiqueId requis', 400)

    const products = await prisma.product.findMany({
      where: {
        boutiqueId,
        ...(search && { name: { contains: search, mode: 'insensitive' } }),
        ...(categoryId && { categoryId }),
      },
      include: { variants: true, category: true },
      orderBy: { createdAt: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    })

    const total = await prisma.product.count({ where: { boutiqueId } })
    res.json({ success: true, products, total })
  } catch (e) { next(e) }
})

productRouter.patch('/:id', authenticate, async (req, res, next) => {
  try {
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: req.body,
      include: { variants: true },
    })
    res.json({ success: true, product })
  } catch (e) { next(e) }
})

productRouter.delete('/:id', authenticate, async (req, res, next) => {
  try {
    await prisma.product.update({
      where: { id: req.params.id },
      data: { isActive: false },
    })
    res.json({ success: true })
  } catch (e) { next(e) }
})

// Ajustement stock manuel
productRouter.post('/:id/stock', authenticate, async (req, res, next) => {
  try {
    const { adjustment, reason } = req.body
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: { stock: { increment: adjustment } },
    })
    res.json({ success: true, product })
  } catch (e) { next(e) }
})
