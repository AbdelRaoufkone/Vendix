'use client'

import { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ShoppingBag, X, ChevronRight, Download, CreditCard,
  Loader2, AlertCircle, CheckCircle, Clock, Package,
  Truck, XCircle, RefreshCw
} from 'lucide-react'
import { api } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/format'
import { useBoutiqueId } from '@/hooks/useBoutiqueId'
import { useNotificationStore } from '@/store/notification.store'

// ── Types ────────────────────────────────────────────────────────────────────

interface OrderItem {
  id: string
  productName: string
  quantity: number
  unitPrice: number
  total: number
}

interface Order {
  id: string
  number: string
  status: string
  total: number
  paidAmount: number
  createdAt: string
  customer: { name: string; phone?: string; email?: string }
  items: OrderItem[]
  payments?: { id: string; amount: number; method: string; createdAt: string }[]
  note?: string
}

type StatusKey = 'ALL' | 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'DELIVERED' | 'CANCELLED'

// ── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PENDING:   { label: 'En attente',   color: 'bg-yellow-100 text-yellow-700',  icon: <Clock size={12} /> },
  CONFIRMED: { label: 'Confirmée',    color: 'bg-blue-100 text-blue-700',      icon: <CheckCircle size={12} /> },
  PREPARING: { label: 'Préparation',  color: 'bg-purple-100 text-purple-700',  icon: <Package size={12} /> },
  READY:     { label: 'Prête',        color: 'bg-green-100 text-green-700',    icon: <CheckCircle size={12} /> },
  DELIVERED: { label: 'Livrée',       color: 'bg-gray-100 text-gray-600',      icon: <Truck size={12} /> },
  CANCELLED: { label: 'Annulée',      color: 'bg-red-100 text-red-600',        icon: <XCircle size={12} /> },
}

const TABS: { key: StatusKey; label: string }[] = [
  { key: 'ALL',       label: 'Toutes' },
  { key: 'PENDING',   label: 'En attente' },
  { key: 'CONFIRMED', label: 'Confirmées' },
  { key: 'PREPARING', label: 'Préparation' },
  { key: 'READY',     label: 'Prêtes' },
  { key: 'DELIVERED', label: 'Livrées' },
  { key: 'CANCELLED', label: 'Annulées' },
]

const NEXT_ACTIONS: Record<string, { label: string; next: string; color: string }[]> = {
  PENDING:   [{ label: 'Confirmer',  next: 'CONFIRMED', color: 'bg-blue-600 text-white' }, { label: 'Annuler', next: 'CANCELLED', color: 'bg-red-100 text-red-700' }],
  CONFIRMED: [{ label: 'Démarrer préparation', next: 'PREPARING', color: 'bg-purple-600 text-white' }, { label: 'Annuler', next: 'CANCELLED', color: 'bg-red-100 text-red-700' }],
  PREPARING: [{ label: 'Marquer prête', next: 'READY', color: 'bg-green-600 text-white' }],
  READY:     [{ label: 'Marquer livrée', next: 'DELIVERED', color: 'bg-gray-700 text-white' }],
  DELIVERED: [],
  CANCELLED: [],
}

const PAYMENT_METHODS = ['CASH', 'WAVE', 'ORANGE_MONEY', 'MTN_MOMO']

// ── Main Component ───────────────────────────────────────────────────────────

export default function CommandesPage() {
  const { boutiqueId, isLoading: loadingBoutique } = useBoutiqueId()
  const clearOrders = useNotificationStore(s => s.clearOrders)
  const [activeTab, setActiveTab] = useState<StatusKey>('ALL')

  useEffect(() => { clearOrders() }, [])
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const queryClient = useQueryClient()

  const statusParam = activeTab !== 'ALL' ? `&status=${activeTab}` : ''

  const { data, isLoading, error } = useQuery<{ orders: Order[]; total: number }>({
    queryKey: ['orders', boutiqueId, activeTab],
    queryFn: () => api.get(`/orders?boutiqueId=${boutiqueId}${statusParam}&limit=50`).then(r => r.data),
    enabled: !!boutiqueId,
    refetchInterval: 30_000,
  })

  const { data: pendingData } = useQuery<{ total: number }>({
    queryKey: ['orders', boutiqueId, 'PENDING', 'count'],
    queryFn: () => api.get(`/orders?boutiqueId=${boutiqueId}&status=PENDING&limit=1`).then(r => r.data),
    enabled: !!boutiqueId,
    refetchInterval: 30_000,
  })

  // Refresh selected order when list refreshes
  useEffect(() => {
    if (selectedOrder && data?.orders) {
      const updated = data.orders.find(o => o.id === selectedOrder.id)
      if (updated) setSelectedOrder(updated)
    }
  }, [data])

  // Close drawer on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelectedOrder(null) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const openOrder = useCallback(async (order: Order) => {
    // Fetch full order details
    try {
      const res = await api.get(`/orders/${order.id}`)
      setSelectedOrder(res.data.order ?? res.data)
    } catch {
      setSelectedOrder(order)
    }
  }, [])

  if (loadingBoutique) return <LoadingScreen />

  const orders = data?.orders ?? []
  const pendingCount = pendingData?.total ?? 0

  return (
    <div className="p-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Commandes</h1>
          {pendingCount > 0 && (
            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded-full">
              {pendingCount} en attente
            </span>
          )}
        </div>
        <button
          onClick={() => queryClient.invalidateQueries({ queryKey: ['orders'] })}
          className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4 -mx-1 px-1">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={28} className="animate-spin text-indigo-600" />
        </div>
      ) : error ? (
        <ErrorState message="Impossible de charger les commandes" />
      ) : orders.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <ShoppingBag size={40} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">Aucune commande{activeTab !== 'ALL' ? ' dans cette catégorie' : ''}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map(order => (
            <OrderRow key={order.id} order={order} onClick={() => openOrder(order)} />
          ))}
        </div>
      )}

      {/* Drawer */}
      {selectedOrder && (
        <OrderDrawer
          order={selectedOrder}
          boutiqueId={boutiqueId!}
          onClose={() => setSelectedOrder(null)}
          onShowPayment={() => setShowPaymentModal(true)}
          onStatusChange={(updated) => {
            setSelectedOrder(updated)
            queryClient.invalidateQueries({ queryKey: ['orders'] })
          }}
        />
      )}

      {/* Payment modal */}
      {showPaymentModal && selectedOrder && (
        <PaymentModal
          order={selectedOrder}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={(updated) => {
            setShowPaymentModal(false)
            setSelectedOrder(updated)
            queryClient.invalidateQueries({ queryKey: ['orders'] })
          }}
        />
      )}
    </div>
  )
}

// ── OrderRow ─────────────────────────────────────────────────────────────────

function OrderRow({ order, onClick }: { order: Order; onClick: () => void }) {
  const status = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.PENDING
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-gray-100 hover:border-indigo-200 transition-colors text-left"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="font-semibold text-sm text-gray-900">{order.number}</p>
          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${status.color}`}>
            {status.icon}
            {status.label}
          </span>
        </div>
        <p className="text-xs text-gray-500">{order.customer.name} · {order.items?.length ?? 0} article(s)</p>
      </div>
      <div className="flex items-center gap-2 ml-3">
        <div className="text-right">
          <p className="text-sm font-bold text-gray-900">{formatCurrency(order.total)}</p>
          <p className="text-xs text-gray-400">{formatDate(order.createdAt)}</p>
        </div>
        <ChevronRight size={16} className="text-gray-300" />
      </div>
    </button>
  )
}

// ── OrderDrawer ───────────────────────────────────────────────────────────────

function OrderDrawer({
  order, boutiqueId, onClose, onShowPayment, onStatusChange
}: {
  order: Order
  boutiqueId: string
  onClose: () => void
  onShowPayment: () => void
  onStatusChange: (updated: Order) => void
}) {
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const statusMutation = useMutation({
    mutationFn: ({ status, note }: { status: string; note?: string }) =>
      api.patch(`/orders/${order.id}/status`, { status, note }).then(r => r.data),
    onSuccess: (data) => {
      onStatusChange(data.order ?? data)
    },
  })

  const handleDownloadReceipt = async () => {
    setDownloading(true)
    try {
      const res = await api.get(`/orders/${order.id}/receipt`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `recu-${order.number}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch {
      // silent
    } finally {
      setDownloading(false)
    }
  }

  const actions = NEXT_ACTIONS[order.status] ?? []
  const status = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.PENDING
  const balance = order.total - (order.paidAmount ?? 0)

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
      />
      {/* Panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white z-50 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-900">{order.number}</h2>
            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium mt-0.5 ${status.color}`}>
              {status.icon} {status.label}
            </span>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Client */}
          <Section title="Client">
            <p className="font-semibold text-gray-900">{order.customer.name}</p>
            {order.customer.phone && <p className="text-sm text-gray-500">{order.customer.phone}</p>}
            {order.customer.email && <p className="text-sm text-gray-500">{order.customer.email}</p>}
          </Section>

          {/* Articles */}
          <Section title="Articles">
            <div className="space-y-2">
              {order.items?.map(item => (
                <div key={item.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.productName}</p>
                    <p className="text-xs text-gray-500">{item.quantity} × {formatCurrency(item.unitPrice)}</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{formatCurrency(item.total)}</p>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-100 mt-3 pt-3 flex justify-between">
              <p className="font-semibold text-gray-900">Total</p>
              <p className="font-bold text-gray-900">{formatCurrency(order.total)}</p>
            </div>
          </Section>

          {/* Paiement */}
          <Section title="Paiement">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-500">Payé</span>
              <span className="font-semibold text-green-600">{formatCurrency(order.paidAmount ?? 0)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Reste à payer</span>
              <span className={`font-semibold ${balance > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                {formatCurrency(balance)}
              </span>
            </div>
            {order.payments && order.payments.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {order.payments.map(p => (
                  <div key={p.id} className="flex justify-between text-xs text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg">
                    <span>{p.method} · {formatDate(p.createdAt)}</span>
                    <span className="font-medium text-gray-700">{formatCurrency(p.amount)}</span>
                  </div>
                ))}
              </div>
            )}
            {balance > 0 && (
              <button
                onClick={onShowPayment}
                className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                <CreditCard size={16} />
                Enregistrer un paiement
              </button>
            )}
          </Section>

          {/* Date */}
          <div className="text-xs text-gray-400">
            Commande du {formatDate(order.createdAt)}
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-gray-100 space-y-2">
          {/* Confirmation annulation */}
          {confirmCancel ? (
            <div className="bg-red-50 rounded-xl p-3 space-y-2">
              <p className="text-sm text-red-700 font-medium">Confirmer l'annulation ?</p>
              <div className="flex gap-2">
                <button
                  onClick={() => { statusMutation.mutate({ status: 'CANCELLED' }); setConfirmCancel(false) }}
                  className="flex-1 py-2 bg-red-600 text-white text-sm rounded-xl font-medium"
                >
                  Oui, annuler
                </button>
                <button
                  onClick={() => setConfirmCancel(false)}
                  className="flex-1 py-2 bg-gray-100 text-gray-700 text-sm rounded-xl font-medium"
                >
                  Non
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              {actions.map(action => (
                <button
                  key={action.next}
                  onClick={() => {
                    if (action.next === 'CANCELLED') {
                      setConfirmCancel(true)
                    } else {
                      statusMutation.mutate({ status: action.next })
                    }
                  }}
                  disabled={statusMutation.isPending}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-opacity disabled:opacity-60 ${action.color}`}
                >
                  {statusMutation.isPending ? <Loader2 size={14} className="mx-auto animate-spin" /> : action.label}
                </button>
              ))}
            </div>
          )}

          {/* Télécharger reçu */}
          <button
            onClick={handleDownloadReceipt}
            disabled={downloading}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-60"
          >
            {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            Télécharger le reçu
          </button>
        </div>
      </div>
    </>
  )
}

// ── PaymentModal ──────────────────────────────────────────────────────────────

function PaymentModal({ order, onClose, onSuccess }: {
  order: Order
  onClose: () => void
  onSuccess: (updated: Order) => void
}) {
  const [amount, setAmount] = useState(String(order.total - (order.paidAmount ?? 0)))
  const [method, setMethod] = useState('CASH')
  const [reference, setReference] = useState('')

  const mutation = useMutation({
    mutationFn: () =>
      api.post('/payments', {
        orderId: order.id,
        amount: parseFloat(amount),
        method,
        reference: reference || undefined,
      }).then(r => r.data),
    onSuccess: (data) => onSuccess(data.order ?? data),
  })

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[60]" onClick={onClose} />
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 bg-white rounded-2xl z-[70] p-6 max-w-sm mx-auto shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-gray-900">Enregistrer un paiement</h3>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Montant</label>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Mode de paiement</label>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_METHODS.map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  className={`py-2.5 text-sm rounded-xl font-medium transition-colors ${
                    method === m ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {m === 'CASH' ? 'Espèces' : m.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {method !== 'CASH' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Référence (optionnel)</label>
              <input
                type="text"
                value={reference}
                onChange={e => setReference(e.target.value)}
                placeholder="Numéro de transaction"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}
        </div>

        <button
          onClick={() => mutation.mutate()}
          disabled={!amount || parseFloat(amount) <= 0 || mutation.isPending}
          className="mt-5 w-full py-3 bg-indigo-600 text-white rounded-xl font-medium disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {mutation.isPending ? <Loader2 size={16} className="animate-spin" /> : null}
          Confirmer le paiement
        </button>

        {mutation.isError && (
          <p className="text-sm text-red-500 mt-2 text-center">Erreur lors de l'enregistrement</p>
        )}
      </div>
    </>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{title}</h3>
      <div className="bg-gray-50 rounded-xl p-4">{children}</div>
    </div>
  )
}

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={28} className="animate-spin text-indigo-600" />
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-red-500">
      <AlertCircle size={20} />
      <p className="text-sm">{message}</p>
    </div>
  )
}
