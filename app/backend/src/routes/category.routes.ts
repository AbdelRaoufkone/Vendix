import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authenticate, AuthRequest } from '../middleware/auth.middleware'
import { AppError } from '../middleware/error.middleware'

export const categoryRouter = Router()

const createCategorySchema = z.object({
  boutiqueId: z.string(),
  name: z.string().min(1).max(80),
  icon: z.string().optional(),
  parentId: z.string().optional(),
})

const updateCategorySchema = z.object({
  name: z.string().min(1).max(80).optional(),
  icon: z.string().optional(),
  parentId: z.string().nullable().optional(),
})

// Helper — vérifier que l'utilisateur est propriétaire de la boutique
async function assertOwner(boutiqueId: string, userId: string) {
  const boutique = await prisma.boutique.findFirst({
    where: { id: boutiqueId, ownerId: userId },
    select: { id: true },
  })
  if (!boutique) throw new AppError('Boutique introuvable ou accès refusé', 403)
}

// GET /api/categories?boutiqueId=xxx
categoryRouter.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { boutiqueId } = req.query as Record<string, string>
    if (!boutiqueId) throw new AppError('boutiqueId requis', 400)

    await assertOwner(boutiqueId, req.user!.id)

    const categories = await prisma.category.findMany({
      where: { boutiqueId },
      include: {
        children: true,
        _count: { select: { products: { where: { isActive: true } } } },
      },
      orderBy: { name: 'asc' },
    })

    res.json({ success: true, categories })
  } catch (e) {
    next(e)
  }
})

// POST /api/categories
categoryRouter.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const data = createCategorySchema.parse(req.body)

    await assertOwner(data.boutiqueId, req.user!.id)

    if (data.parentId) {
      const parent = await prisma.category.findFirst({
        where: { id: data.parentId, boutiqueId: data.boutiqueId },
      })
      if (!parent) throw new AppError('Catégorie parente introuvable', 404)
    }

    const category = await prisma.category.create({
      data: {
        boutiqueId: data.boutiqueId,
        name: data.name,
        icon: data.icon,
        parentId: data.parentId,
      },
      include: { children: true },
    })

    res.status(201).json({ success: true, category })
  } catch (e) {
    next(e)
  }
})

// PATCH /api/categories/:id
categoryRouter.patch('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const data = updateCategorySchema.parse(req.body)

    const existing = await prisma.category.findUnique({
      where: { id: req.params.id },
      select: { boutiqueId: true },
    })
    if (!existing) throw new AppError('Catégorie introuvable', 404)

    await assertOwner(existing.boutiqueId, req.user!.id)

    if (data.parentId) {
      const parent = await prisma.category.findFirst({
        where: { id: data.parentId, boutiqueId: existing.boutiqueId },
      })
      if (!parent) throw new AppError('Catégorie parente introuvable', 404)
      // Empêcher une catégorie d'être son propre parent
      if (data.parentId === req.params.id) throw new AppError('Une catégorie ne peut pas être son propre parent', 400)
    }

    const category = await prisma.category.update({
      where: { id: req.params.id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.icon !== undefined && { icon: data.icon }),
        ...(data.parentId !== undefined && { parentId: data.parentId }),
      },
      include: { children: true },
    })

    res.json({ success: true, category })
  } catch (e) {
    next(e)
  }
})

// DELETE /api/categories/:id
categoryRouter.delete('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const existing = await prisma.category.findUnique({
      where: { id: req.params.id },
      select: { boutiqueId: true },
    })
    if (!existing) throw new AppError('Catégorie introuvable', 404)

    await assertOwner(existing.boutiqueId, req.user!.id)

    // Vérifier qu'aucun produit actif n'est lié
    const activeProducts = await prisma.product.count({
      where: { categoryId: req.params.id, isActive: true },
    })
    if (activeProducts > 0) {
      throw new AppError(
        `Impossible de supprimer : ${activeProducts} produit(s) actif(s) lié(s) à cette catégorie`,
        409,
      )
    }

    // Vérifier qu'il n'y a pas de sous-catégories
    const children = await prisma.category.count({
      where: { parentId: req.params.id },
    })
    if (children > 0) {
      throw new AppError(
        `Impossible de supprimer : cette catégorie possède ${children} sous-catégorie(s)`,
        409,
      )
    }

    await prisma.category.delete({ where: { id: req.params.id } })

    res.json({ success: true, message: 'Catégorie supprimée' })
  } catch (e) {
    next(e)
  }
})
