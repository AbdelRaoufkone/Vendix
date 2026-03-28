'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Truck, X, ChevronRight, Loader2, AlertCircle,
  Package, CheckCircle, FileText, Phone, Mail, MapPin
} from 'lucide-react'
import { api } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/format'
import { useBoutiqueId } from '@/hooks/useBoutiqueId'

// ── Types ────────────────────────────────────────────────────────────────────

interface Supplier {
  id: string
  name: string
  phone?: string
  email?: string
  address?: string
  notes?: string
  purchaseOrders?: PurchaseOrder[]
}

interface PurchaseOrder {
  id: string
  number: string
  status: string
  totalAmount: number
  expectedAt?: string
  createdAt: string
  items: POItem[]
}

interface POItem {
  id: string
  productName: string
  quantity: number
  receivedQuantity?: number
  unitPrice: number
  total: number
}

interface Product {
  id: string
  name: string
  price: number
}

interface SupplierForm {
  name: string
  phone: string
  email: string
  address: string
  notes: string
}

const EMPTY_SUPPLIER: SupplierForm = { name: '', phone: '', email: '', address: '', notes: '' }

const PO_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING:  { label: 'En attente',   color: 'bg-yellow-100 text-yellow-700' },
  SENT:     { label: 'Envoyé',       color: 'bg-blue-100 text-blue-700' },
  RECEIVED: { label: 'Reçu',         color: 'bg-green-100 text-green-700' },
  PARTIAL:  { label: 'Partiel',      color: 'bg-orange-100 text-orange-700' },
  CANCELLED:{ label: 'Annulé',       color: 'bg-red-100 text-red-700' },
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function FournisseursPage() {
  const { boutiqueId, isLoading: loadingBoutique } = useBoutiqueId()
  const [selected, setSelected] = useState<Supplier | null>(null)
  const [supplierModal, setSupplierModal] = useState(false)
  const [poModal, setPOModal] = useState(false)
  const [receiveModal, setReceiveModal] = useState<PurchaseOrder | null>(null)

  const { data, isLoading, error } = useQuery<{ suppliers: Supplier[] }>({
    queryKey: ['suppliers', boutiqueId],
    queryFn: () => api.get(`/suppliers?boutiqueId=${boutiqueId}`).then(r => r.data),
    enabled: !!boutiqueId,
  })

  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') { setSelected(null) } }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const queryClient = useQueryClient()

  const openSupplier = async (supplier: Supplier) => {
    try {
      const res = await api.get(`/suppliers/${supplier.id}`)
      setSelected(res.data.supplier ?? res.data)
    } catch {
      setSelected(supplier)
    }
  }

  if (loadingBoutique) return <LoadingScreen />

  const suppliers = data?.suppliers ?? []

  return (
    <div className="p-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-gray-900">Fournisseurs</h1>
        <button
          onClick={() => setSupplierModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <Plus size={16} />
          Ajouter
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={28} className="animate-spin text-indigo-600" />
        </div>
      ) : error ? (
        <ErrorState message="Impossible de charger les fournisseurs" />
      ) : suppliers.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Truck size={40} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">Aucun fournisseur pour le moment</p>
          <button
            onClick={() => setSupplierModal(true)}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium"
          >
            Ajouter un fournisseur
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {suppliers.map(supplier => (
            <SupplierRow key={supplier.id} supplier={supplier} onClick={() => openSupplier(supplier)} />
          ))}
        </div>
      )}

      {/* Detail Panel */}
      {selected && (
        <SupplierPanel
          supplier={selected}
          onClose={() => setSelected(null)}
          onCreatePO={() => setPOModal(true)}
          onReceivePO={(po) => setReceiveModal(po)}
        />
      )}

      {/* Modals */}
      {supplierModal && (
        <SupplierFormModal
          boutiqueId={boutiqueId!}
          onClose={() => setSupplierModal(false)}
          onSuccess={() => {
            setSupplierModal(false)
            queryClient.invalidateQueries({ queryKey: ['suppliers'] })
          }}
        />
      )}

      {poModal && selected && (
        <PurchaseOrderModal
          supplier={selected}
          boutiqueId={boutiqueId!}
          onClose={() => setPOModal(false)}
          onSuccess={() => {
            setPOModal(false)
            openSupplier(selected)
            queryClient.invalidateQueries({ queryKey: ['suppliers'] })
          }}
        />
      )}

      {receiveModal && (
        <ReceiveModal
          po={receiveModal}
          onClose={() => setReceiveModal(null)}
          onSuccess={() => {
            setReceiveModal(null)
            if (selected) openSupplier(selected)
            queryClient.invalidateQueries({ queryKey: ['suppliers'] })
          }}
        />
      )}
    </div>
  )
}

// ── SupplierRow ───────────────────────────────────────────────────────────────

function SupplierRow({ supplier, onClick }: { supplier: Supplier; onClick: () => void }) {
  const initials = supplier.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 bg-white rounded-xl px-4 py-3 border border-gray-100 hover:border-indigo-200 transition-colors text-left"
    >
      <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 font-bold text-sm flex-shrink-0">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-gray-900">{supplier.name}</p>
        <p className="text-xs text-gray-500">
          {supplier.phone}
          {supplier.purchaseOrders?.length ? ` · ${supplier.purchaseOrders.length} BC` : ''}
        </p>
      </div>
      <ChevronRight size={16} className="text-gray-300" />
    </button>
  )
}

// ── SupplierPanel ─────────────────────────────────────────────────────────────

function SupplierPanel({ supplier, onClose, onCreatePO, onReceivePO }: {
  supplier: Supplier
  onClose: () => void
  onCreatePO: () => void
  onReceivePO: (po: PurchaseOrder) => void
}) {
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white z-50 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-900">{supplier.name}</h2>
            {supplier.phone && <p className="text-xs text-gray-500">{supplier.phone}</p>}
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Contact info */}
          <Section title="Coordonnées">
            <div className="space-y-2">
              {supplier.phone && (
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Phone size={14} className="text-gray-400 flex-shrink-0" /> {supplier.phone}
                </div>
              )}
              {supplier.email && (
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Mail size={14} className="text-gray-400 flex-shrink-0" /> {supplier.email}
                </div>
              )}
              {supplier.address && (
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <MapPin size={14} className="text-gray-400 flex-shrink-0" /> {supplier.address}
                </div>
              )}
              {supplier.notes && (
                <p className="text-sm text-gray-500 italic mt-2">{supplier.notes}</p>
              )}
            </div>
          </Section>

          {/* Purchase orders */}
          <Section title="Bons de commande">
            {!supplier.purchaseOrders?.length ? (
              <p className="text-sm text-gray-400 text-center py-2">Aucun bon de commande</p>
            ) : (
              <div className="space-y-2">
                {supplier.purchaseOrders.map(po => {
                  const status = PO_STATUS_CONFIG[po.status] ?? PO_STATUS_CONFIG.PENDING
                  return (
                    <div key={po.id} className="bg-white border border-gray-100 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <FileText size={14} className="text-gray-400" />
                          <p className="text-sm font-medium text-gray-900">{po.number}</p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.color}`}>
                          {status.label}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-500">
                          {formatDate(po.createdAt)}
                          {po.expectedAt && ` · Livraison: ${formatDate(po.expectedAt)}`}
                        </p>
                        <p className="text-sm font-bold text-gray-900">{formatCurrency(po.totalAmount)}</p>
                      </div>
                      {po.status === 'PENDING' || po.status === 'SENT' ? (
                        <button
                          onClick={() => onReceivePO(po)}
                          className="mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 bg-green-50 text-green-700 text-xs rounded-lg font-medium hover:bg-green-100 transition-colors"
                        >
                          <CheckCircle size={13} />
                          Marquer comme reçu
                        </button>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            )}
          </Section>
        </div>

        {/* Action */}
        <div className="p-4 border-t border-gray-100">
          <button
            onClick={onCreatePO}
            className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
          >
            <Plus size={16} />
            Nouveau bon de commande
          </button>
        </div>
      </div>
    </>
  )
}

// ── SupplierFormModal ─────────────────────────────────────────────────────────

function SupplierFormModal({ boutiqueId, onClose, onSuccess }: {
  boutiqueId: string
  onClose: () => void
  onSuccess: () => void
}) {
  const [form, setForm] = useState<SupplierForm>({ ...EMPTY_SUPPLIER })

  const mutation = useMutation({
    mutationFn: () =>
      api.post('/suppliers', { ...form, boutiqueId }).then(r => r.data),
    onSuccess,
  })

  const field = (key: keyof SupplierForm) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value })),
  })

  return (
    <Modal title="Ajouter un fournisseur" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <Label>Nom *</Label>
          <Input {...field('name')} placeholder="Ex: Grossiste Central" />
        </div>
        <div>
          <Label>Téléphone</Label>
          <Input {...field('phone')} placeholder="+225..." type="tel" />
        </div>
        <div>
          <Label>Email</Label>
          <Input {...field('email')} placeholder="contact@fournisseur.com" type="email" />
        </div>
        <div>
          <Label>Adresse</Label>
          <Input {...field('address')} placeholder="Adresse complète" />
        </div>
        <div>
          <Label>Notes</Label>
          <textarea
            {...field('notes')}
            rows={2}
            placeholder="Notes internes..."
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
        </div>
        <button
          onClick={() => mutation.mutate()}
          disabled={!form.name || mutation.isPending}
          className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {mutation.isPending && <Loader2 size={16} className="animate-spin" />}
          Créer le fournisseur
        </button>
      </div>
    </Modal>
  )
}

// ── PurchaseOrderModal ────────────────────────────────────────────────────────

function PurchaseOrderModal({ supplier, boutiqueId, onClose, onSuccess }: {
  supplier: Supplier
  boutiqueId: string
  onClose: () => void
  onSuccess: () => void
}) {
  const [lines, setLines] = useState<{ productName: string; quantity: string; unitPrice: string }[]>([
    { productName: '', quantity: '', unitPrice: '' }
  ])
  const [notes, setNotes] = useState('')
  const [expectedAt, setExpectedAt] = useState('')
  const [productSearch, setProductSearch] = useState<Record<number, string>>({})

  const { data: products } = useQuery<Product[]>({
    queryKey: ['products', boutiqueId, 'autocomplete'],
    queryFn: () => api.get(`/products?boutiqueId=${boutiqueId}&limit=100`).then(r => r.data.products ?? r.data),
    enabled: !!boutiqueId,
  })

  const mutation = useMutation({
    mutationFn: () => {
      const items = lines
        .filter(l => l.productName && l.quantity && l.unitPrice)
        .map(l => ({
          productName: l.productName,
          quantity: parseInt(l.quantity),
          unitPrice: parseFloat(l.unitPrice),
        }))
      return api.post(`/suppliers/${supplier.id}/purchase-orders`, {
        items,
        notes: notes || undefined,
        expectedAt: expectedAt || undefined,
      }).then(r => r.data)
    },
    onSuccess,
  })

  const total = lines.reduce((sum, l) => sum + (parseInt(l.quantity) || 0) * (parseFloat(l.unitPrice) || 0), 0)

  const updateLine = (idx: number, field: string, value: string) => {
    setLines(ls => ls.map((l, i) => i === idx ? { ...l, [field]: value } : l))
  }

  const filteredProducts = (search: string) =>
    (products ?? []).filter(p => p.name.toLowerCase().includes(search.toLowerCase())).slice(0, 5)

  return (
    <Modal title="Nouveau bon de commande" onClose={onClose} wide>
      <div className="space-y-4">
        <div className="bg-gray-50 rounded-xl px-4 py-2.5 flex items-center gap-2">
          <Truck size={16} className="text-gray-400" />
          <p className="text-sm font-medium text-gray-700">{supplier.name}</p>
        </div>

        {/* Lines */}
        <div>
          <Label>Articles</Label>
          <div className="space-y-2">
            {lines.map((line, idx) => {
              const suggestions = productSearch[idx] ? filteredProducts(productSearch[idx]) : []
              return (
                <div key={idx} className="relative">
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <input
                        value={line.productName}
                        onChange={e => {
                          updateLine(idx, 'productName', e.target.value)
                          setProductSearch(s => ({ ...s, [idx]: e.target.value }))
                        }}
                        placeholder="Nom du produit"
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      {suggestions.length > 0 && line.productName && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10">
                          {suggestions.map(p => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                updateLine(idx, 'productName', p.name)
                                updateLine(idx, 'unitPrice', String(p.price))
                                setProductSearch(s => ({ ...s, [idx]: '' }))
                              }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 first:rounded-t-xl last:rounded-b-xl"
                            >
                              {p.name} — {formatCurrency(p.price)}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <input
                      type="number"
                      value={line.quantity}
                      onChange={e => updateLine(idx, 'quantity', e.target.value)}
                      placeholder="Qté"
                      className="w-16 px-2 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center"
                    />
                    <input
                      type="number"
                      value={line.unitPrice}
                      onChange={e => updateLine(idx, 'unitPrice', e.target.value)}
                      placeholder="Prix"
                      className="w-24 px-2 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    {lines.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setLines(ls => ls.filter((_, i) => i !== idx))}
                        className="p-2 text-gray-400 hover:text-red-500"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                  {line.quantity && line.unitPrice && (
                    <p className="text-xs text-gray-400 mt-0.5 ml-1">
                      = {formatCurrency((parseInt(line.quantity) || 0) * (parseFloat(line.unitPrice) || 0))}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
          <button
            type="button"
            onClick={() => setLines(ls => [...ls, { productName: '', quantity: '', unitPrice: '' }])}
            className="mt-2 flex items-center gap-1.5 text-sm text-indigo-600 font-medium hover:text-indigo-700"
          >
            <Plus size={15} /> Ajouter une ligne
          </button>
        </div>

        {total > 0 && (
          <div className="bg-indigo-50 rounded-xl px-4 py-3 flex justify-between items-center">
            <span className="text-sm font-medium text-indigo-700">Total estimé</span>
            <span className="font-bold text-indigo-700">{formatCurrency(total)}</span>
          </div>
        )}

        <div>
          <Label>Date de livraison attendue</Label>
          <input
            type="date"
            value={expectedAt}
            onChange={e => setExpectedAt(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <Label>Notes</Label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            placeholder="Instructions supplémentaires..."
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <button
          onClick={() => mutation.mutate()}
          disabled={lines.every(l => !l.productName) || mutation.isPending}
          className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {mutation.isPending && <Loader2 size={16} className="animate-spin" />}
          Créer le bon de commande
        </button>
      </div>
    </Modal>
  )
}

// ── ReceiveModal ──────────────────────────────────────────────────────────────

function ReceiveModal({ po, onClose, onSuccess }: {
  po: PurchaseOrder
  onClose: () => void
  onSuccess: () => void
}) {
  const [received, setReceived] = useState<Record<string, string>>(
    Object.fromEntries(po.items.map(i => [i.id, String(i.quantity)]))
  )

  const mutation = useMutation({
    mutationFn: () =>
      api.patch(`/suppliers/purchase-orders/${po.id}/receive`, {
        items: po.items.map(i => ({
          itemId: i.id,
          receivedQuantity: parseInt(received[i.id]) || 0,
        })),
      }).then(r => r.data),
    onSuccess,
  })

  return (
    <Modal title={`Réception — ${po.number}`} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-gray-500">Indiquez les quantités réellement reçues :</p>
        <div className="space-y-3">
          {po.items.map(item => (
            <div key={item.id} className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{item.productName}</p>
                <p className="text-xs text-gray-500">Commandé : {item.quantity}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Reçu :</span>
                <input
                  type="number"
                  value={received[item.id]}
                  onChange={e => setReceived(r => ({ ...r, [item.id]: e.target.value }))}
                  min={0}
                  max={item.quantity}
                  className="w-16 text-center px-2 py-1.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 text-white rounded-xl font-medium disabled:opacity-60"
        >
          {mutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
          Confirmer la réception
        </button>
      </div>
    </Modal>
  )
}

// ── Shared UI ─────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{title}</h3>
      <div className="bg-gray-50 rounded-xl p-4">{children}</div>
    </div>
  )
}

function Modal({ title, onClose, children, wide }: {
  title: string
  onClose: () => void
  children: React.ReactNode
  wide?: boolean
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[60]" onClick={onClose} />
      <div className={`fixed inset-x-4 top-1/2 -translate-y-1/2 bg-white rounded-2xl z-[70] p-6 shadow-2xl overflow-y-auto max-h-[90vh] ${wide ? 'max-w-lg' : 'max-w-sm'} mx-auto`}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-sm font-medium text-gray-700 mb-1.5">{children}</label>
}

function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${className ?? ''}`}
    />
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
