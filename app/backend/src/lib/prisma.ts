import { PrismaClient } from '@prisma/client'
import { logger } from './logger'

declare global {
  var __prisma: PrismaClient | undefined
}

export const prisma = global.__prisma ?? new PrismaClient({
  log: [
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'warn' },
  ],
})

// Rediriger les erreurs Prisma vers Winston
prisma.$on('error' as never, (e: any) => {
  logger.error('Prisma error', { message: e.message, target: e.target })
})
prisma.$on('warn' as never, (e: any) => {
  logger.warn('Prisma warning', { message: e.message })
})

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma
}
