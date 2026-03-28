import { Router } from 'express'
import { z } from 'zod'
import bcrypt from 'bcrypt'
import { prisma } from '../lib/prisma'
import { authenticate, AuthRequest } from '../middleware/auth.middleware'
import { AppError } from '../middleware/error.middleware'

export const employeeRouter = Router()

const inviteEmployeeSchema = z.object({
  boutiqueId: z.string(),
  email: z.string().email().optional(),
  phone: z.string().min(8).optional(),
  role: z.enum(['MANAGER', 'CASHIER', 'DELIVERY']),
}).refine(d => d.email || d.phone, { message: 'Email ou téléphone requis' })

const updateEmployeeSchema = z.object({
  role: z.enum(['MANAGER', 'CASHIER', 'DELIVERY']),
})

// Helper — vérifier propriétaire boutique
async function assertOwner(boutiqueId: string, userId: string) {
  const boutique = await prisma.boutique.findFirst({
    where: { id: boutiqueId, ownerId: userId },
    select: { id: true },
  })
  if (!boutique) throw new AppError('Boutique introuvable ou accès refusé', 403)
}

// GET /api/employees?boutiqueId=xxx
employeeRouter.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { boutiqueId } = req.query as Record<string, string>
    if (!boutiqueId) throw new AppError('boutiqueId requis', 400)

    await assertOwner(boutiqueId, req.user!.id)

    const employees = await prisma.employee.findMany({
      where: { boutiqueId },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true, avatar: true, role: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    res.json({ success: true, employees })
  } catch (e) {
    next(e)
  }
})

// POST /api/employees — inviter un employé
employeeRouter.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const data = inviteEmployeeSchema.parse(req.body)

    await assertOwner(data.boutiqueId, req.user!.id)

    // Trouver ou créer l'utilisateur
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          ...(data.email ? [{ email: data.email }] : []),
          ...(data.phone ? [{ phone: data.phone }] : []),
        ],
      },
    })

    if (!user) {
      // Créer un compte avec un mot de passe temporaire
      const tempPassword = Math.random().toString(36).slice(-8)
      const hashed = await bcrypt.hash(tempPassword, 12)
      user = await prisma.user.create({
        data: {
          name: data.email ?? data.phone ?? 'Employé',
          email: data.email,
          phone: data.phone,
          password: hashed,
          role: 'CUSTOMER',
        },
      })
    }

    // Vérifier que cet utilisateur n'est pas déjà employé dans cette boutique
    const existing = await prisma.employee.findFirst({
      where: { boutiqueId: data.boutiqueId, userId: user.id },
    })
    if (existing) {
      if (existing.isActive) {
        throw new AppError('Cet utilisateur est déjà employé dans cette boutique', 409)
      }
      // Réactiver l'employé désactivé avec le nouveau rôle
      const reactivated = await prisma.employee.update({
        where: { id: existing.id },
        data: { isActive: true, role: data.role },
        include: {
          user: {
            select: { id: true, name: true, email: true, phone: true, avatar: true, role: true },
          },
        },
      })
      return res.json({ success: true, employee: reactivated })
    }

    const employee = await prisma.employee.create({
      data: {
        boutiqueId: data.boutiqueId,
        userId: user.id,
        role: data.role,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true, avatar: true, role: true },
        },
      },
    })

    res.status(201).json({ success: true, employee })
  } catch (e) {
    next(e)
  }
})

// PATCH /api/employees/:id — modifier le rôle
employeeRouter.patch('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const data = updateEmployeeSchema.parse(req.body)

    const existing = await prisma.employee.findUnique({
      where: { id: req.params.id },
      select: { boutiqueId: true },
    })
    if (!existing) throw new AppError('Employé introuvable', 404)

    await assertOwner(existing.boutiqueId, req.user!.id)

    const employee = await prisma.employee.update({
      where: { id: req.params.id },
      data: { role: data.role },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true, avatar: true, role: true },
        },
      },
    })

    res.json({ success: true, employee })
  } catch (e) {
    next(e)
  }
})

// DELETE /api/employees/:id — désactiver (soft delete)
employeeRouter.delete('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const existing = await prisma.employee.findUnique({
      where: { id: req.params.id },
      select: { boutiqueId: true },
    })
    if (!existing) throw new AppError('Employé introuvable', 404)

    await assertOwner(existing.boutiqueId, req.user!.id)

    const employee = await prisma.employee.update({
      where: { id: req.params.id },
      data: { isActive: false },
    })

    res.json({ success: true, employee, message: 'Employé désactivé' })
  } catch (e) {
    next(e)
  }
})
