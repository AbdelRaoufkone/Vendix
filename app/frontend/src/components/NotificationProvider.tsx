'use client'

import { useEffect, useRef } from 'react'
import { X, MessageCircle, ShoppingBag } from 'lucide-react'
import { getSocket } from '@/lib/socket'
import { useBoutiqueId } from '@/hooks/useBoutiqueId'
import { useNotificationStore, AppNotification } from '@/store/notification.store'
import { useQueryClient } from '@tanstack/react-query'

// ── Toast display ─────────────────────────────────────────────────────────────

function Toast({ notif, onDismiss }: { notif: AppNotification; onDismiss: () => void }) {
  const isMessage = notif.type === 'message'

  useEffect(() => {
    const t = setTimeout(onDismiss, 5000)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="flex items-start gap-3 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 p-4">
      <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${
        isMessage ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'
      }`}>
        {isMessage ? <MessageCircle size={18} /> : <ShoppingBag size={18} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900">{notif.title}</p>
        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notif.body}</p>
      </div>
      <button
        onClick={onDismiss}
        className="flex-shrink-0 text-gray-300 hover:text-gray-500 transition-colors mt-0.5"
      >
        <X size={14} />
      </button>
    </div>
  )
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function NotificationProvider() {
  const { boutiqueId } = useBoutiqueId()
  const { notifications, add, remove } = useNotificationStore()
  const queryClient = useQueryClient()
  const joinedRef = useRef<string | null>(null)

  // Demander la permission de notifications navigateur au premier chargement
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  useEffect(() => {
    if (!boutiqueId || joinedRef.current === boutiqueId) return
    joinedRef.current = boutiqueId

    const socket = getSocket()
    socket.emit('join:boutique', { boutiqueId })

    const showBrowserNotif = (title: string, body: string) => {
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/icon-192.png' })
      }
    }

    const onNewMessage = ({ conversationId, message }: any) => {
      const body = message.content?.slice(0, 80) || 'Message reçu'
      add({ type: 'message', title: 'Nouveau message', body, data: { conversationId } })
      showBrowserNotif('Nouveau message', body)
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    }

    const onNewOrder = (order: any) => {
      const body = `${order.number} — ${Number(order.total).toLocaleString('fr-FR')} FCFA`
      add({ type: 'order', title: 'Nouvelle commande !', body, data: { orderId: order.id } })
      showBrowserNotif('🛍 Nouvelle commande !', body)
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
    }

    socket.on('notification:new_message', onNewMessage)
    socket.on('order:new', onNewOrder)

    return () => {
      socket.off('notification:new_message', onNewMessage)
      socket.off('order:new', onNewOrder)
    }
  }, [boutiqueId])

  // Afficher les 3 dernières notifs non lues (toasts)
  const toasts = notifications.slice(0, 3)

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map(n => (
        <div key={n.id} className="pointer-events-auto">
          <Toast notif={n} onDismiss={() => remove(n.id)} />
        </div>
      ))}
    </div>
  )
}
