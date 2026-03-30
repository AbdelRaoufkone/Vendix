import { prisma } from '../lib/prisma'
import { io } from '../index'
import { mailService } from './mail.service'
import { logger } from '../lib/logger'

export const notificationService = {
    /**
     * Notifie le commerçant d'un nouveau message
     */
    async notifyNewMessage(conversationId: string, message: any) {
        try {
            // 1. Récupérer la boutique et son propriétaire
            const conversation = await prisma.conversation.findUnique({
                where: { id: conversationId },
                include: {
                    boutique: {
                        include: {
                            owner: true,
                            settings: true,
                            employees: {
                                where: { isActive: true },
                                include: { user: true },
                            },
                        },
                    },
                    customer: true,
                    supplier: true,
                },
            })

            if (!conversation || !conversation.boutique) return

            const { boutique } = conversation
            const senderName = conversation.customer?.name || conversation.supplier?.name || 'Client'
            const title = 'Nouveau message'
            const body = `${senderName} : ${message.content.slice(0, 50)}${message.content.length > 50 ? '...' : ''}`

            // 2. Créer une notification persistante en base pour le propriétaire
            await prisma.notification.create({
                data: {
                    userId: boutique.ownerId,
                    boutiqueId: boutique.id,
                    title,
                    body,
                    type: 'message',
                    data: { conversationId, messageId: message.id },
                },
            })

            // Aussi pour les employés ? (Optionnel, on commence par le proprio)
            for (const emp of boutique.employees) {
                await prisma.notification.create({
                    data: {
                        userId: emp.userId,
                        boutiqueId: boutique.id,
                        title,
                        body,
                        type: 'message',
                        data: { conversationId, messageId: message.id },
                    },
                })
            }

            // 3. Emettre via WebSocket (Temps réel dashboard)
            io.to(`boutique:${boutique.id}`).emit('notification:new_message', {
                conversationId,
                message,
            })

            // 4. Notification Email (si activé)
            const settings = boutique.settings as any
            const targetEmail = settings?.contactEmail || boutique.owner.email
            if (settings?.notifEmail && targetEmail) {
                await mailService.sendEmail({
                    to: targetEmail,
                    subject: `[VENDIX] Nouveau message de ${senderName}`,
                    text: `Vous avez reçu un nouveau message de ${senderName} sur votre boutique ${boutique.name}.\n\nMessage : ${message.content}\n\nRépondez ici : ${process.env.FRONTEND_URL}/dashboard/messages/${conversationId}`,
                    html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; rounded: 8px;">
              <h2 style="color: #6366f1;">Nouveau message !</h2>
              <p>Bonjour ${boutique.owner.name},</p>
              <p>Vous avez reçu un nouveau message de <strong>${senderName}</strong> sur votre boutique <strong>${boutique.name}</strong>.</p>
              <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
                "${message.content}"
              </div>
              <a href="${process.env.FRONTEND_URL}/dashboard/messages/${conversationId}" 
                 style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                 Répondre au message
              </a>
              <p style="margin-top: 30px; font-size: 12px; color: #9ca3af;">
                Vous recevez cet email car les notifications par email sont activées pour votre boutique.
              </p>
            </div>
          `,
                }).catch(err => logger.error('Erreur envoi email notification message', err))
            }

            // 5. Notification Push (si activé et pushToken présent)
            if (boutique.settings?.notifPush && boutique.owner.pushToken) {
                logger.info('Push notification ready to be sent', {
                    token: boutique.owner.pushToken,
                    title,
                    body,
                })
            }

        } catch (error) {
            logger.error('Erreur dans notificationService.notifyNewMessage', error)
        }
    },
}
