'use client'

import { useQuery } from '@tanstack/react-query'
import { ShoppingBag, Users, Package, TrendingUp, Bell, MessageCircle } from 'lucide-react'
import { api } from '@/lib/api'
import { formatCurrency } from '@/lib/format'
import { useBoutiqueId } from '@/hooks/useBoutiqueId'

export default function DashboardPage() {
  const { boutiqueId } = useBoutiqueId()

  const { data: stats } = useQuery({
    queryKey: ['stats', boutiqueId],
    queryFn: () => api.get(`/stats/summary?boutiqueId=${boutiqueId}`).then(r => r.data),
    enabled: !!boutiqueId,
    refetchInterval: 30_000,
  })

  const { data: recentOrders } = useQuery({
    queryKey: ['orders', 'recent', boutiqueId],
    queryFn: () => api.get(`/orders?boutiqueId=${boutiqueId}&limit=5`).then(r => r.data.orders),
    enabled: !!boutiqueId,
  })

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bonjour 👋</h1>
          <p className="text-gray-500 text-sm">Voici ce qui se passe aujourd'hui</p>
        </div>
        <button className="relative p-2 bg-gray-100 rounded-xl">
          <Bell size={20} />
          {stats?.unreadMessages > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {stats.unreadMessages}
            </span>
          )}
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <StatCard
          label="Ventes du jour"
          value={formatCurrency(stats?.todayRevenue ?? 0)}
          icon={<TrendingUp size={20} className="text-green-600" />}
          bg="bg-green-50"
        />
        <StatCard
          label="Commandes en cours"
          value={stats?.pendingOrders ?? 0}
          icon={<ShoppingBag size={20} className="text-indigo-600" />}
          bg="bg-indigo-50"
          alert={stats?.pendingOrders > 5}
        />
        <StatCard
          label="Clients actifs"
          value={stats?.activeCustomers ?? 0}
          icon={<Users size={20} className="text-blue-600" />}
          bg="bg-blue-50"
        />
        <StatCard
          label="Produits en rupture"
          value={stats?.lowStockProducts ?? 0}
          icon={<Package size={20} className="text-orange-600" />}
          bg="bg-orange-50"
          alert={stats?.lowStockProducts > 0}
        />
      </div>

      {/* Messages non lus */}
      {stats?.unreadMessages > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-4 flex items-center gap-3">
          <MessageCircle size={20} className="text-indigo-600" />
          <div className="flex-1">
            <p className="font-medium text-indigo-900 text-sm">
              {stats.unreadMessages} message{stats.unreadMessages > 1 ? 's' : ''} non lu{stats.unreadMessages > 1 ? 's' : ''}
            </p>
          </div>
          <a href="/dashboard/messages" className="text-indigo-600 text-sm font-medium">Voir</a>
        </div>
      )}

      {/* Dernières commandes */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">Dernières commandes</h2>
          <a href="/dashboard/commandes" className="text-indigo-600 text-sm">Voir tout</a>
        </div>
        <div className="space-y-2">
          {recentOrders?.map((order: any) => (
            <OrderRow key={order.id} order={order} />
          ))}
          {!recentOrders?.length && (
            <div className="text-center py-8 text-gray-400">
              <ShoppingBag size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Aucune commande pour le moment</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon, bg, alert }: {
  label: string
  value: string | number
  icon: React.ReactNode
  bg: string
  alert?: boolean
}) {
  return (
    <div className={`${bg} rounded-xl p-4 ${alert ? 'ring-2 ring-orange-400' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-500 font-medium">{label}</span>
        {icon}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  )
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'En attente', color: 'bg-yellow-100 text-yellow-700' },
  CONFIRMED: { label: 'Confirmée', color: 'bg-blue-100 text-blue-700' },
  PREPARING: { label: 'Préparation', color: 'bg-purple-100 text-purple-700' },
  READY: { label: 'Prête', color: 'bg-green-100 text-green-700' },
  DELIVERED: { label: 'Livrée', color: 'bg-gray-100 text-gray-700' },
  CANCELLED: { label: 'Annulée', color: 'bg-red-100 text-red-700' },
}

function OrderRow({ order }: { order: any }) {
  const status = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.PENDING
  return (
    <a
      href={`/dashboard/commandes/${order.id}`}
      className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-gray-100 hover:border-indigo-200 transition-colors"
    >
      <div>
        <p className="font-medium text-sm text-gray-900">{order.number}</p>
        <p className="text-xs text-gray-500">{order.customer.name}</p>
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${status.color}`}>
          {status.label}
        </span>
        <p className="text-sm font-semibold text-gray-900">{formatCurrency(order.total)}</p>
      </div>
    </a>
  )
}
