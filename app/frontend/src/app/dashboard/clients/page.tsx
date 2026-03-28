'use client'

import { useState, useEffect, useRef, KeyboardEvent } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Search, Users, X, ChevronRight, Loader2, AlertCircle,
  ShoppingBag, Star, Phone, Mail, Save, Download, Upload,
  MessageSquare, UserPlus, FileText
} from 'lucide-react'
import { api } from '@/lib/api'
import { formatCurrency, formatDate, timeAgo } from '@/lib/format'
import { useBoutiqueId } from '@/hooks/useBoutiqueId'

// ── Types ────────────────────────────────────────────────────────────────────

interface Customer {
  id: string
  name: string
  phone?: string
  email?: string
  ordersCount: number
  totalSpent: number
  loyaltyPoints: number
  lastOrderAt?: string
  tags: string[]
  notes?: string
  orders?: CustomerOrder[]
}

interface CustomerOrder {
  id: string
  number: string
  total: number
  status: string
  createdAt: string
}

const STATUS_COLORS: Record<string, string> = {
  PENDING:   'bg-yellow-100 text-yellow-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  PREPARING: 'bg-purple-100 text-purple-700',
  READY:     'bg-green-100 text-green-700',
  DELIVERED: 'bg-gray-100 text-gray-600',
  CANCELLED: 'bg-red-100 text-red-600',
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'En attente', CONFIRMED: 'Confirmée', PREPARING: 'Préparation',
  READY: 'Prête', DELIVERED: 'Livrée', CANCELLED: 'Annulée',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function cleanPhone(phone?: string) {
  if (!phone) return ''
  return phone.replace(/[\s\-().]/g, '')
}

function exportCustomersCSV(customers: Customer[]) {
  const headers = ['Nom', 'Téléphone', 'Email', 'Commandes', 'Total dépensé (FCFA)', 'Points fidélité', 'Étiquettes', 'Notes']
  const rows = customers.map(c => [
    `"${c.name}"`,
    c.phone ?? '',
    c.email ?? '',
    c.ordersCount,
    c.totalSpent,
    c.loyaltyPoints,
    `"${(c.tags ?? []).join('|')}"`,
    `"${(c.notes ?? '').replace(/"/g, "'")}"`,
  ])
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `clients-vendix-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function downloadVCard(customer: Customer) {
  const phone = cleanPhone(customer.phone)
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${customer.name}`,
    ...(phone ? [`TEL:${phone}`] : []),
    ...(customer.email ? [`EMAIL:${customer.email}`] : []),
    `NOTE:Client VENDIX — ${customer.ordersCount} commande(s)`,
    'END:VCARD',
  ]
  const blob = new Blob([lines.join('\r\n')], { type: 'text/vcard;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${customer.name.replace(/\s+/g, '_')}.vcf`
  a.click()
  URL.revokeObjectURL(url)
}

function parseCSV(text: string): Array<{ name: string; phone?: string; email?: string }> {
  const lines = text.trim().split('\n').filter(Boolean)
  if (lines.length < 2) return []

  // Detect delimiter
  const delimiter = lines[0].includes(';') ? ';' : ','
  const headers = lines[0].split(delimiter).map(h => h.replace(/"/g, '').trim().toLowerCase())

  const nameIdx = headers.findIndex(h => h.includes('nom') || h === 'name')
  const phoneIdx = headers.findIndex(h => h.includes('tel') || h.includes('phone') || h.includes('tél'))
  const emailIdx = headers.findIndex(h => h.includes('email') || h.includes('mail'))

  if (nameIdx === -1) return []

  return lines.slice(1).map(line => {
    const cols = line.split(delimiter).map(c => c.replace(/^"|"$/g, '').trim())
    return {
      name: cols[nameIdx] ?? '',
      phone: phoneIdx >= 0 ? cols[phoneIdx] : undefined,
      email: emailIdx >= 0 ? cols[emailIdx] : undefined,
    }
  }).filter(c => c.name)
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function ClientsPage() {
  const { boutiqueId, isLoading: loadingBoutique } = useBoutiqueId()
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Customer | null>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ created: number; skipped: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery<{ customers: Customer[] }>({
    queryKey: ['customers', boutiqueId, search],
    queryFn: () => {
      const params = new URLSearchParams({ boutiqueId: boutiqueId! })
      if (search) params.set('search', search)
      return api.get(`/customers?${params}`).then(r => r.data)
    },
    enabled: !!boutiqueId,
  })

  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') setSelected(null) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const openCustomer = async (customer: Customer) => {
    try {
      const res = await api.get(`/customers/${customer.id}`)
      setSelected(res.data.customer ?? res.data)
    } catch {
      setSelected(customer)
    }
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !boutiqueId) return
    setImporting(true)
    setImportResult(null)
    try {
      const text = await file.text()
      const customers = parseCSV(text)
      if (customers.length === 0) { setImporting(false); return }
      const res = await api.post('/customers/import', { boutiqueId, customers })
      setImportResult({ created: res.data.created, skipped: res.data.skipped })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    } catch {
      // silent
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  if (loadingBoutique) return <LoadingScreen />

  const customers = data?.customers ?? []

  return (
    <div className="p-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          {customers.length > 0 && (
            <span className="text-sm text-gray-500">{customers.length}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Export CSV */}
          {customers.length > 0 && (
            <button
              onClick={() => exportCustomersCSV(customers)}
              className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
              title="Exporter CSV"
            >
              <Download size={15} />
              <span className="hidden sm:inline">Exporter</span>
            </button>
          )}
          {/* Import CSV */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-60"
            title="Importer CSV"
          >
            {importing ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
            <span className="hidden sm:inline">Importer</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleImport}
          />
        </div>
      </div>

      {/* Import result feedback */}
      {importResult && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm flex items-center justify-between">
          <span>{importResult.created} client(s) importé(s), {importResult.skipped} ignoré(s) (doublon)</span>
          <button onClick={() => setImportResult(null)} className="text-green-400 hover:text-green-600">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Hint import format */}
      <div className="mb-4 bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5 text-xs text-blue-600">
        <strong>Format CSV import :</strong> colonnes <code>Nom</code>, <code>Téléphone</code>, <code>Email</code> (séparateur virgule ou point-virgule)
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher par nom, téléphone, email..."
          className="w-full pl-9 pr-4 py-2.5 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={28} className="animate-spin text-indigo-600" />
        </div>
      ) : error ? (
        <ErrorState message="Impossible de charger les clients" />
      ) : customers.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Users size={40} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">{search ? 'Aucun client trouvé' : 'Aucun client pour le moment'}</p>
          {!search && (
            <p className="text-xs mt-1">Les clients apparaissent ici après leur première commande ou importation CSV</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {customers.map(customer => (
            <CustomerRow key={customer.id} customer={customer} onClick={() => openCustomer(customer)} />
          ))}
        </div>
      )}

      {/* Detail Panel */}
      {selected && (
        <CustomerPanel
          customer={selected}
          boutiqueId={boutiqueId!}
          onClose={() => setSelected(null)}
          onUpdate={(updated) => setSelected(updated)}
        />
      )}
    </div>
  )
}

// ── CustomerRow ───────────────────────────────────────────────────────────────

function CustomerRow({ customer, onClick }: { customer: Customer; onClick: () => void }) {
  const initials = customer.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 bg-white rounded-xl px-4 py-3 border border-gray-100 hover:border-indigo-200 transition-colors text-left"
    >
      <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm flex-shrink-0">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-sm text-gray-900 truncate">{customer.name}</p>
          {customer.tags?.map(tag => (
            <span key={tag} className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full font-medium flex-shrink-0">
              {tag}
            </span>
          ))}
        </div>
        <p className="text-xs text-gray-500">
          {customer.phone ?? customer.email ?? '—'}
          {customer.ordersCount > 0 && ` · ${customer.ordersCount} cmd`}
          {customer.totalSpent > 0 && ` · ${formatCurrency(customer.totalSpent)}`}
        </p>
      </div>
      <div className="text-right ml-2 flex-shrink-0">
        {customer.lastOrderAt && (
          <p className="text-xs text-gray-400">{timeAgo(customer.lastOrderAt)}</p>
        )}
        <ChevronRight size={16} className="text-gray-300 ml-auto mt-1" />
      </div>
    </button>
  )
}

// ── CustomerPanel ─────────────────────────────────────────────────────────────

function CustomerPanel({ customer, boutiqueId, onClose, onUpdate }: {
  customer: Customer
  boutiqueId: string
  onClose: () => void
  onUpdate: (updated: Customer) => void
}) {
  const [notes, setNotes] = useState(customer.notes ?? '')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>(customer.tags ?? [])
  const queryClient = useQueryClient()

  const phone = cleanPhone(customer.phone)
  const waPhone = phone.startsWith('+') ? phone.slice(1) : phone

  const saveMutation = useMutation({
    mutationFn: () =>
      api.patch(`/customers/${customer.id}`, { notes, tags }).then(r => r.data),
    onSuccess: (data) => {
      onUpdate(data.customer ?? { ...customer, notes, tags })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
  })

  const handleAddTag = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      const newTag = tagInput.trim()
      if (!tags.includes(newTag)) setTags(t => [...t, newTag])
      setTagInput('')
    }
  }

  const removeTag = (tag: string) => setTags(t => t.filter(x => x !== tag))

  const initials = customer.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white z-50 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
              {initials}
            </div>
            <div>
              <h2 className="font-bold text-gray-900">{customer.name}</h2>
              {customer.phone && <p className="text-xs text-gray-500">{customer.phone}</p>}
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* ── Actions de contact ── */}
          {phone && (
            <Section title="Contacter">
              <div className="grid grid-cols-3 gap-2">
                <a
                  href={`tel:${phone}`}
                  className="flex flex-col items-center gap-1.5 py-3 bg-white border border-gray-200 rounded-xl hover:border-green-300 hover:bg-green-50 transition-colors"
                >
                  <div className="w-9 h-9 bg-green-100 text-green-600 rounded-xl flex items-center justify-center">
                    <Phone size={18} />
                  </div>
                  <span className="text-xs font-medium text-gray-700">Appeler</span>
                </a>
                <a
                  href={`sms:${phone}`}
                  className="flex flex-col items-center gap-1.5 py-3 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-colors"
                >
                  <div className="w-9 h-9 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                    <MessageSquare size={18} />
                  </div>
                  <span className="text-xs font-medium text-gray-700">SMS</span>
                </a>
                <a
                  href={`https://wa.me/${waPhone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-1.5 py-3 bg-white border border-gray-200 rounded-xl hover:border-emerald-300 hover:bg-emerald-50 transition-colors"
                >
                  <div className="w-9 h-9 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-gray-700">WhatsApp</span>
                </a>
              </div>
            </Section>
          )}

          {/* ── Informations ── */}
          <Section title="Informations">
            <div className="space-y-2">
              {customer.phone && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Phone size={14} className="text-gray-400" />
                    {customer.phone}
                  </div>
                  <button
                    onClick={() => downloadVCard(customer)}
                    className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 px-2 py-1 bg-indigo-50 rounded-lg transition-colors"
                    title="Enregistrer dans les contacts"
                  >
                    <UserPlus size={12} />
                    Enregistrer
                  </button>
                </div>
              )}
              {customer.email && (
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Mail size={14} className="text-gray-400" />
                  <a href={`mailto:${customer.email}`} className="hover:text-indigo-600">{customer.email}</a>
                </div>
              )}
              {!customer.phone && !customer.email && (
                <p className="text-sm text-gray-400">Aucune coordonnée renseignée</p>
              )}
            </div>
          </Section>

          {/* ── Statistiques ── */}
          <Section title="Statistiques">
            <div className="grid grid-cols-3 gap-3">
              <StatBox label="Commandes" value={customer.ordersCount} />
              <StatBox label="Total dépensé" value={formatCurrency(customer.totalSpent)} small />
              <StatBox label="Points fidélité" value={customer.loyaltyPoints ?? 0} icon={<Star size={12} className="text-yellow-500" />} />
            </div>
          </Section>

          {/* ── Historique commandes ── */}
          {customer.orders && customer.orders.length > 0 && (
            <Section title="Historique commandes">
              <div className="space-y-2">
                {customer.orders.map(order => (
                  <div key={order.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{order.number}</p>
                      <p className="text-xs text-gray-500">{formatDate(order.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_LABELS[order.status] ?? order.status}
                      </span>
                      <p className="text-sm font-semibold text-gray-900">{formatCurrency(order.total)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* ── Notes ── */}
          <Section title="Notes">
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Ajouter des notes sur ce client..."
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </Section>

          {/* ── Étiquettes ── */}
          <Section title="Étiquettes">
            <div className="flex flex-wrap gap-2 mb-3">
              {tags.map(tag => (
                <span key={tag} className="flex items-center gap-1 text-xs px-2.5 py-1 bg-indigo-100 text-indigo-700 rounded-full font-medium">
                  {tag}
                  <button onClick={() => removeTag(tag)} className="hover:text-red-500"><X size={12} /></button>
                </span>
              ))}
            </div>
            <input
              type="text"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              placeholder="Ajouter une étiquette (Entrée)"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </Section>
        </div>

        {/* Save + actions */}
        <div className="p-4 border-t border-gray-100 space-y-2">
          {/* Export vCard bouton en bas aussi */}
          <div className="flex gap-2">
            {customer.phone && (
              <button
                onClick={() => downloadVCard(customer)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                <FileText size={15} />
                Enregistrer le contact
              </button>
            )}
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className={`flex items-center justify-center gap-2 py-2.5 bg-indigo-600 text-white rounded-xl font-medium disabled:opacity-60 ${customer.phone ? 'flex-1' : 'w-full'}`}
            >
              {saveMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Enregistrer
            </button>
          </div>
          {saveMutation.isSuccess && (
            <p className="text-xs text-green-600 text-center">Modifications sauvegardées</p>
          )}
        </div>
      </div>
    </>
  )
}

// ── UI Helpers ────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{title}</h3>
      <div className="bg-gray-50 rounded-xl p-4">{children}</div>
    </div>
  )
}

function StatBox({ label, value, small, icon }: { label: string; value: string | number; small?: boolean; icon?: React.ReactNode }) {
  return (
    <div className="text-center bg-white rounded-xl p-3 border border-gray-100">
      <div className="flex items-center justify-center gap-1">
        {icon}
        <p className={`font-bold text-gray-900 ${small ? 'text-xs' : 'text-lg'}`}>{value}</p>
      </div>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
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
