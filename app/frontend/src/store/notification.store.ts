import { create } from 'zustand'

export interface AppNotification {
  id: string
  type: 'message' | 'order'
  title: string
  body: string
  timestamp: number
  data?: any
}

interface NotificationStore {
  notifications: AppNotification[]
  unreadMessages: number
  newOrders: number
  add: (n: Omit<AppNotification, 'id' | 'timestamp'>) => void
  clearMessages: () => void
  clearOrders: () => void
  remove: (id: string) => void
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  notifications: [],
  unreadMessages: 0,
  newOrders: 0,
  add: (n) => set(s => ({
    notifications: [
      { ...n, id: Math.random().toString(36).slice(2), timestamp: Date.now() },
      ...s.notifications,
    ].slice(0, 30),
    unreadMessages: n.type === 'message' ? s.unreadMessages + 1 : s.unreadMessages,
    newOrders: n.type === 'order' ? s.newOrders + 1 : s.newOrders,
  })),
  clearMessages: () => set({ unreadMessages: 0 }),
  clearOrders: () => set({ newOrders: 0 }),
  remove: (id) => set(s => ({ notifications: s.notifications.filter(n => n.id !== id) })),
}))
