'use client'

import { LayoutDashboard, ShoppingBag, Package, Users, Truck, BarChart2, MessageCircle, Settings } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NotificationProvider } from '@/components/NotificationProvider'
import { useNotificationStore } from '@/store/notification.store'

const NAV_ITEMS = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Accueil' },
  { href: '/dashboard/commandes', icon: ShoppingBag, label: 'Commandes' },
  { href: '/dashboard/produits', icon: Package, label: 'Produits' },
  { href: '/dashboard/clients', icon: Users, label: 'Clients' },
  { href: '/dashboard/fournisseurs', icon: Truck, label: 'Fournisseurs' },
  { href: '/dashboard/messages', icon: MessageCircle, label: 'Messages' },
  { href: '/dashboard/statistiques', icon: BarChart2, label: 'Stats' },
  { href: '/dashboard/parametres', icon: Settings, label: 'Paramètres' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const unreadMessages = useNotificationStore(s => s.unreadMessages)
  const newOrders = useNotificationStore(s => s.newOrders)

  const BADGES: Record<string, number> = {
    '/dashboard/messages': unreadMessages,
    '/dashboard/commandes': newOrders,
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar desktop */}
      <aside className="hidden md:flex flex-col w-60 bg-white border-r border-gray-100 py-6">
        <div className="px-6 mb-8">
          <h1 className="text-2xl font-black text-indigo-600 tracking-tight">VENDIX</h1>
          <p className="text-xs text-gray-400">Tableau de bord</p>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const active = pathname === href
            const badge = BADGES[href] ?? 0
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  active
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon size={18} />
                <span className="flex-1">{label}</span>
                {badge > 0 && !active && (
                  <span className="min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Contenu principal */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto pb-20 md:pb-0">
          {children}
        </div>
      </main>

      {/* Bottom nav mobile */}
      <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-white border-t border-gray-100 safe-bottom">
        <div className="flex justify-around py-2">
          {NAV_ITEMS.slice(0, 5).map(({ href, icon: Icon, label }) => {
            const active = pathname === href
            const badge = BADGES[href] ?? 0
            return (
              <Link
                key={href}
                href={href}
                className={`relative flex flex-col items-center gap-0.5 px-3 py-1 ${
                  active ? 'text-indigo-600' : 'text-gray-400'
                }`}
              >
                <span className="relative">
                  <Icon size={22} />
                  {badge > 0 && !active && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </span>
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Toast notifications */}
      <NotificationProvider />
    </div>
  )
}
