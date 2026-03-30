import nodemailer from 'nodemailer'
import { logger } from '../lib/logger'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true', // false pour 587, true pour 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export const mailService = {
  /**
   * Envoie un email
   */
  async sendEmail({ to, subject, text, html }: { to: string; subject: string; text?: string; html?: string }) {
    try {
      if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
        logger.warn('SMTP non configuré, email non envoyé', { to, subject })
        return
      }

      const info = await transporter.sendMail({
        from: process.env.SMTP_FROM || 'VENDIX <noreply@vendix.app>',
        to,
        subject,
        text,
        html,
      })

      logger.info('Email envoyé', { messageId: info.messageId, to })
      return info
    } catch (error) {
      logger.error('Erreur envoi email', { error, to, subject })
      throw error
    }
  },
}
