import { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../lib/jwt'
import { AppError } from './error.middleware'

export interface AuthRequest extends Request {
  user?: { id: string; role: string }
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) throw new AppError('Non authentifié', 401)

  const token = auth.split(' ')[1]
  const payload = verifyToken(token)
  req.user = { id: payload.sub as string, role: payload.role }
  next()
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new AppError('Accès refusé', 403)
    }
    next()
  }
}
