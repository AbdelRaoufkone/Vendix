import winston from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'
import path from 'path'

const LOGS_DIR = path.join(process.cwd(), 'logs')

// ── Formats ───────────────────────────────────────────────────────────────────

const timestamp = winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' })

// Console — lisible et coloré
const consoleFormat = winston.format.combine(
  timestamp,
  winston.format.colorize({ all: false, level: true }),
  winston.format.printf(({ level, message, timestamp, ...meta }) => {
    const metaStr = Object.keys(meta).length
      ? '\n  ' + JSON.stringify(meta, null, 2).replace(/\n/g, '\n  ')
      : ''
    return `${timestamp}  ${level.padEnd(7)}  ${message}${metaStr}`
  })
)

// Fichier — JSON structuré pour archivage / analyse
const fileFormat = winston.format.combine(
  timestamp,
  winston.format.errors({ stack: true }),
  winston.format.json()
)

// ── Transports ────────────────────────────────────────────────────────────────

// Rotation quotidienne — tous les logs (info+)
const combinedRotate = new DailyRotateFile({
  dirname: LOGS_DIR,
  filename: 'vendix-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,          // compresser les anciens fichiers
  maxSize: '20m',               // max 20MB par fichier
  maxFiles: '30d',              // garder 30 jours d'historique
  level: 'info',
  format: fileFormat,
})

// Rotation quotidienne — erreurs seulement
const errorRotate = new DailyRotateFile({
  dirname: LOGS_DIR,
  filename: 'vendix-errors-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '10m',
  maxFiles: '90d',              // erreurs gardées 90 jours
  level: 'error',
  format: fileFormat,
})

// ── Logger ────────────────────────────────────────────────────────────────────

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  transports: [
    new winston.transports.Console({ format: consoleFormat }),
    combinedRotate,
    errorRotate,
  ],
  exceptionHandlers: [
    new DailyRotateFile({
      dirname: LOGS_DIR,
      filename: 'vendix-exceptions-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxFiles: '90d',
      format: fileFormat,
    }),
  ],
  rejectionHandlers: [
    new DailyRotateFile({
      dirname: LOGS_DIR,
      filename: 'vendix-rejections-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxFiles: '90d',
      format: fileFormat,
    }),
  ],
})

// ── Morgan stream (HTTP request logs) ────────────────────────────────────────

export const morganStream = {
  write: (message: string) => {
    logger.http(message.trim())
  },
}
