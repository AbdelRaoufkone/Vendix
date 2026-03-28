import { Request, Response, NextFunction } from 'express'
import { logger } from '../lib/logger'

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 400,
    public code?: string
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (err instanceof AppError) {
    // Erreurs métier (4xx) — warn seulement
    if (err.statusCode >= 500) {
      logger.error('AppError 5xx', {
        message: err.message,
        statusCode: err.statusCode,
        method: req.method,
        url: req.originalUrl,
        stack: err.stack,
      })
    } else {
      logger.warn(`${err.statusCode} ${err.message}`, {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
      })
    }

    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.code,
    })
  }

  // Erreur inattendue — toujours logger en error avec stack
  logger.error('Unhandled error', {
    message: err.message,
    stack: err.stack,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    body: req.body,
  })

  return res.status(500).json({
    success: false,
    message: 'Erreur interne du serveur',
  })
}
