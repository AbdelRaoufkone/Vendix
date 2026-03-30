import { Router } from 'express'
import { z } from 'zod'
import bcrypt from 'bcrypt'
import { prisma } from '../lib/prisma'
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../lib/jwt'
import { AppError } from '../middleware/error.middleware'
import { authLimiter } from '../middleware/rateLimit.middleware'
import { authenticate, AuthRequest } from '../middleware/auth.middleware'

export const authRouter = Router()

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email().optional(),
  phone: z.string().min(8).optional(),
  password: z.string().min(6),
  role: z.enum(['MERCHANT', 'SUPPLIER']).default('MERCHANT'),
}).refine(d => d.email || d.phone, { message: 'Email ou téléphone requis' })

const loginSchema = z.object({
  identifier: z.string(), // email ou phone
  password: z.string(),
})

authRouter.post('/register', authLimiter, async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body)
    const exists = await prisma.user.findFirst({
      where: { OR: [{ email: data.email }, { phone: data.phone }] },
    })
    if (exists) throw new AppError('Compte déjà existant', 409)

    const hashed = await bcrypt.hash(data.password, 12)
    const user = await prisma.user.create({
      data: { ...data, password: hashed },
      select: { id: true, name: true, email: true, phone: true, role: true },
    })

    const accessToken = signAccessToken({ sub: user.id, role: user.role })
    const refreshToken = signRefreshToken({ sub: user.id })
    await prisma.user.update({ where: { id: user.id }, data: { refreshToken } })

    res.status(201).json({ success: true, user, accessToken, refreshToken })
  } catch (e) {
    next(e)
  }
})

authRouter.post('/login', authLimiter, async (req, res, next) => {
  try {
    const { identifier, password } = loginSchema.parse(req.body)
    const user = await prisma.user.findFirst({
      where: { OR: [{ email: identifier }, { phone: identifier }] },
    })
    if (!user) throw new AppError('Identifiants incorrects', 401)

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) throw new AppError('Identifiants incorrects', 401)

    const accessToken = signAccessToken({ sub: user.id, role: user.role })
    const refreshToken = signRefreshToken({ sub: user.id })
    await prisma.user.update({ where: { id: user.id }, data: { refreshToken } })

    const { password: _, refreshToken: __, ...safeUser } = user
    res.json({ success: true, user: safeUser, accessToken, refreshToken })
  } catch (e) {
    next(e)
  }
})

authRouter.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body
    if (!refreshToken) throw new AppError('Refresh token manquant', 401)

    const payload = verifyRefreshToken(refreshToken)
    const user = await prisma.user.findFirst({
      where: { id: payload.sub as string, refreshToken },
    })
    if (!user) throw new AppError('Token invalide', 401)

    const newAccessToken = signAccessToken({ sub: user.id, role: user.role })
    res.json({ success: true, accessToken: newAccessToken })
  } catch (e) {
    next(e)
  }
})

authRouter.post('/logout', async (req, res, next) => {
  try {
    const { refreshToken } = req.body
    if (refreshToken) {
      await prisma.user.updateMany({
        where: { refreshToken },
        data: { refreshToken: null },
      })
    }
    res.json({ success: true })
  } catch (e) {
    next(e)
  }
})

// GET /api/auth/me — profil utilisateur connecté
authRouter.get('/me', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, name: true, email: true, phone: true, role: true, avatar: true, isVerified: true, createdAt: true },
    })
    if (!user) throw new AppError('Utilisateur introuvable', 404)
    res.json({ success: true, user })
  } catch (e) {
    next(e)
  }
})

// POST /api/auth/push-token — enregistrer le token de notification push
authRouter.post('/push-token', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { pushToken } = z.object({
      pushToken: z.string().nullable().optional()
    }).parse(req.body)

    await prisma.user.update({
      where: { id: req.user!.id },
      data: { pushToken: pushToken || null },
    })

    res.json({ success: true, message: 'Push token mis à jour' })
  } catch (e) {
    next(e)
  }
})
