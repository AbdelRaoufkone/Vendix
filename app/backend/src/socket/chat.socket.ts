import { Server, Socket } from 'socket.io'
import { prisma } from '../lib/prisma'
import { verifyToken } from '../lib/jwt'
import { notificationService } from '../services/notification.service'

interface AuthSocket extends Socket {
  userId?: string
  userRole?: string
}

export function initSocketHandlers(io: Server) {
  // Middleware auth socket
  io.use((socket: AuthSocket, next) => {
    const token = socket.handshake.auth.token
    if (!token) {
      // Clients non authentifiés autorisés en lecture seule
      return next()
    }
    try {
      const payload = verifyToken(token)
      socket.userId = payload.sub as string
      socket.userRole = payload.role as string
      next()
    } catch {
      next(new Error('Token invalide'))
    }
  })

  io.on('connection', (socket: AuthSocket) => {
    console.log(`Socket connected: ${socket.id}`)

    // Rejoindre une conversation
    socket.on('join:conversation', async ({ conversationId }) => {
      socket.join(`conv:${conversationId}`)
      // Marquer messages comme lus
      if (socket.userId) {
        await prisma.message.updateMany({
          where: {
            conversationId,
            senderId: { not: socket.userId },
            readAt: null,
          },
          data: { readAt: new Date() },
        })
      }
    })

    // Quitter une conversation
    socket.on('leave:conversation', ({ conversationId }) => {
      socket.leave(`conv:${conversationId}`)
    })

    // Envoyer un message
    socket.on('message:send', async (data, ack) => {
      try {
        const { conversationId, content, type = 'TEXT', metadata } = data

        const message = await prisma.message.create({
          data: {
            conversationId,
            senderId: socket.userId || data.guestId,
            senderType: data.senderType,
            content,
            type,
            metadata,
          },
        })

        // Mettre à jour lastMessageAt + incrémenter unreadCount si message client/fournisseur
        const isFromMerchant = data.senderType === 'MERCHANT'
        await prisma.conversation.update({
          where: { id: conversationId },
          data: {
            lastMessageAt: new Date(),
            ...(isFromMerchant ? {} : { unreadCount: { increment: 1 } }),
          },
        })

        // Broadcast à tous dans la conversation
        io.to(`conv:${conversationId}`).emit('message:new', message)

        // Notifier le commerçant uniquement si le message vient d'un client/fournisseur
        if (!isFromMerchant) {
          await notificationService.notifyNewMessage(conversationId, message)
        }

        ack?.({ success: true, message })
      } catch (error) {
        ack?.({ success: false, error: 'Erreur envoi message' })
      }
    })

    // Rejoindre le room d'une boutique (pour les commerçants)
    socket.on('join:boutique', ({ boutiqueId }) => {
      if (socket.userId) {
        socket.join(`boutique:${boutiqueId}`)
      }
    })

    // Typing indicator
    socket.on('typing:start', ({ conversationId }) => {
      socket.to(`conv:${conversationId}`).emit('typing:start', { userId: socket.userId })
    })

    socket.on('typing:stop', ({ conversationId }) => {
      socket.to(`conv:${conversationId}`).emit('typing:stop', { userId: socket.userId })
    })

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`)
    })
  })
}
