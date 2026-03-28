'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Store, QrCode, Settings2, Users, Bell, Download, Palette,
  Plus, Trash2, Loader2, AlertCircle, CheckCircle, X, Save
} from 'lucide-react'
import { api } from '@/lib/api'
import { useBoutiqueId } from '@/hooks/useBoutiqueId'
import { ImageUploader } from '@/components/ui/ImageUploader'

// ── Types ────────────────────────────────────────────────────────────────────

interface Employee {
  id: string
  name: string
  email?: string
  phone?: string
  role: string
}

interface BoutiqueSettings {
  name: string
  slug: string
  description: string
  phone: string
  city: string
  address: string
  logo: string[]
  banner: string[]
  currency: string
  taxRate: string
  lowStockThreshold: string
  loyaltyPoints: boolean
  notifEmail: boolean
  notifSms: boolean
  notifPush: boolean
}

const ROLES = ['MERCHANT', 'EMPLOYEE', 'MANAGER']
const CURRENCIES = ['XOF', 'EUR', 'USD', 'GNF', 'XAF', 'MAD']

const THEME_COLORS = [
  { name: 'Indigo',   hex: '#6366f1' },
  { name: 'Violet',   hex: '#8b5cf6' },
  { name: 'Fuchsia',  hex: '#d946ef' },
  { name: 'Rose',     hex: '#f43f5e' },
  { name: 'Orange',   hex: '#f97316' },
  { name: 'Ambre',    hex: '#f59e0b' },
  { name: 'Citron',   hex: '#84cc16' },
  { name: 'Émeraude', hex: '#10b981' },
  { name: 'Teal',     hex: '#14b8a6' },
  { name: 'Ciel',     hex: '#0ea5e9' },
  { name: 'Bleu',     hex: '#3b82f6' },
  { name: 'Ardoise',  hex: '#475569' },
]

// ── Main Component ───────────────────────────────────────────────────────────

export default function ParametresPage() {
  const { boutiqueId, boutique, isLoading: loadingBoutique } = useBoutiqueId()
  const queryClient = useQueryClient()

  if (loadingBoutique) return <LoadingScreen />
  if (!boutique || !boutiqueId) return <ErrorState message="Boutique introuvable" />

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>

      <BoutiqueInfoSection boutiqueId={boutiqueId} boutique={boutique} />
      <QRCodeSection slug={boutique.slug} />
      <AdvancedSettingsSection boutiqueId={boutiqueId} boutique={boutique} />
      <TeamSection boutiqueId={boutiqueId} />
      <NotificationsSection boutiqueId={boutiqueId} boutique={boutique} />
    </div>
  )
}

// ── Boutique Info ─────────────────────────────────────────────────────────────

function BoutiqueInfoSection({ boutiqueId, boutique }: { boutiqueId: string; boutique: any }) {
  const [form, setForm] = useState({
    name: boutique.name ?? '',
    slug: boutique.slug ?? '',
    description: boutique.description ?? '',
    phone: boutique.phone ?? '',
    city: boutique.city ?? '',
    address: boutique.address ?? '',
    logo: boutique.logo ? [boutique.logo] : [] as string[],
    banners: (boutique.banners?.length ? boutique.banners : boutique.banner ? [boutique.banner] : []) as string[],
    themeColor: boutique.themeColor ?? '#6366f1',
  })
  const [saved, setSaved] = useState(false)

  const mutation = useMutation({
    mutationFn: () => api.patch(`/boutiques/${boutiqueId}`, {
      name: form.name,
      slug: form.slug,
      description: form.description,
      phone: form.phone,
      city: form.city,
      address: form.address,
      logo: form.logo[0] ?? null,
      banner: form.banners[0] ?? null,
      banners: form.banners,
      themeColor: form.themeColor,
    }).then(r => r.data),
    onSuccess: () => {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    },
  })

  const field = (key: string) => ({
    value: (form as any)[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value })),
  })

  return (
    <Card title="Ma boutique" icon={<Store size={18} className="text-indigo-600" />}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 md:col-span-1">
            <Label>Nom de la boutique</Label>
            <Input {...field('name')} />
          </div>
          <div className="col-span-2 md:col-span-1">
            <Label>Slug (URL)</Label>
            <Input {...field('slug')} placeholder="mon-magasin" />
          </div>
          <div className="col-span-2">
            <Label>Description</Label>
            <textarea
              {...field('description')}
              rows={2}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>
          <div>
            <Label>Téléphone</Label>
            <Input type="tel" {...field('phone')} />
          </div>
          <div>
            <Label>Ville</Label>
            <Input {...field('city')} />
          </div>
          <div className="col-span-2">
            <Label>Adresse</Label>
            <Input {...field('address')} />
          </div>
        </div>

        <div>
          <Label>Logo (1 image)</Label>
          <ImageUploader
            images={form.logo}
            onChange={imgs => setForm(f => ({ ...f, logo: imgs.slice(0, 1) }))}
            max={1}
          />
        </div>

        <div>
          <Label>Bannières (jusqu'à 5 — slider automatique)</Label>
          <ImageUploader
            images={form.banners}
            onChange={imgs => setForm(f => ({ ...f, banners: imgs.slice(0, 5) }))}
            max={5}
          />
          <p className="text-xs text-gray-400 mt-1">
            Ajoutez plusieurs images pour créer un slider sur votre boutique
          </p>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <Palette size={15} className="text-gray-500" />
            <Label>Couleur principale de la boutique</Label>
          </div>
          <div className="flex flex-wrap gap-2 mb-3">
            {THEME_COLORS.map(c => (
              <button
                key={c.hex}
                type="button"
                title={c.name}
                onClick={() => setForm(f => ({ ...f, themeColor: c.hex }))}
                className="relative w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 focus:outline-none"
                style={{
                  backgroundColor: c.hex,
                  borderColor: form.themeColor === c.hex ? '#111827' : 'transparent',
                }}
              >
                {form.themeColor === c.hex && (
                  <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-xs">✓</span>
                )}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={form.themeColor}
              onChange={e => setForm(f => ({ ...f, themeColor: e.target.value }))}
              className="w-10 h-10 rounded-xl border border-gray-200 cursor-pointer p-0.5"
            />
            <span className="text-sm text-gray-500 font-mono">{form.themeColor}</span>
            <span className="text-xs text-gray-400">Couleur personnalisée</span>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Appliquée aux boutons et éléments actifs de votre page boutique
          </p>
        </div>

        <SaveButton
          onClick={() => mutation.mutate()}
          loading={mutation.isPending}
          saved={saved}
          error={mutation.isError}
        />
      </div>
    </Card>
  )
}

// ── QR Code ───────────────────────────────────────────────────────────────────

function QRCodeSection({ slug }: { slug: string }) {
  const { data, isLoading } = useQuery<{ qr: string }>({
    queryKey: ['boutique', 'qr', slug],
    queryFn: () => api.get(`/boutiques/public/${slug}/qr`).then(r => r.data),
    enabled: !!slug,
  })

  const downloadQR = () => {
    if (!data?.qr) return
    const a = document.createElement('a')
    a.href = data.qr.startsWith('data:') ? data.qr : `data:image/png;base64,${data.qr}`
    a.download = `qrcode-${slug}.png`
    a.click()
  }

  return (
    <Card title="QR Code boutique" icon={<QrCode size={18} className="text-indigo-600" />}>
      <div className="flex flex-col items-center gap-4">
        {isLoading ? (
          <div className="w-40 h-40 bg-gray-100 rounded-xl flex items-center justify-center">
            <Loader2 size={24} className="animate-spin text-indigo-600" />
          </div>
        ) : data?.qr ? (
          <img
            src={data.qr.startsWith('data:') ? data.qr : `data:image/png;base64,${data.qr}`}
            alt="QR Code"
            className="w-48 h-48 rounded-xl border border-gray-100"
          />
        ) : (
          <div className="w-40 h-40 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400">
            <QrCode size={40} />
          </div>
        )}
        <p className="text-sm text-gray-500 text-center">
          Partagez ce QR code avec vos clients pour qu'ils accèdent à votre boutique
        </p>
        <button
          onClick={downloadQR}
          disabled={!data?.qr}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium disabled:opacity-50 hover:bg-indigo-700 transition-colors"
        >
          <Download size={16} />
          Télécharger le QR Code
        </button>
      </div>
    </Card>
  )
}

// ── Advanced Settings ─────────────────────────────────────────────────────────

function AdvancedSettingsSection({ boutiqueId, boutique }: { boutiqueId: string; boutique: any }) {
  const [form, setForm] = useState({
    currency: boutique.currency ?? 'XOF',
    taxRate: String(boutique.taxRate ?? '0'),
    lowStockThreshold: String(boutique.lowStockThreshold ?? '5'),
    loyaltyPoints: boutique.loyaltyPoints ?? false,
  })
  const [saved, setSaved] = useState(false)

  const mutation = useMutation({
    mutationFn: () => api.patch(`/boutiques/${boutiqueId}/settings`, {
      currency: form.currency,
      taxRate: parseFloat(form.taxRate) || 0,
      lowStockThreshold: parseInt(form.lowStockThreshold) || 5,
      loyaltyPoints: form.loyaltyPoints,
    }).then(r => r.data),
    onSuccess: () => {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    },
  })

  return (
    <Card title="Paramètres avancés" icon={<Settings2 size={18} className="text-indigo-600" />}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Devise</Label>
            <select
              value={form.currency}
              onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <Label>Taux de taxe (%)</Label>
            <input
              type="number"
              value={form.taxRate}
              onChange={e => setForm(f => ({ ...f, taxRate: e.target.value }))}
              min={0}
              max={100}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <Label>Seuil stock faible</Label>
            <input
              type="number"
              value={form.lowStockThreshold}
              onChange={e => setForm(f => ({ ...f, lowStockThreshold: e.target.value }))}
              min={1}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <ToggleRow
          label="Programme de fidélité"
          description="Activer les points de fidélité pour les clients"
          checked={form.loyaltyPoints}
          onChange={v => setForm(f => ({ ...f, loyaltyPoints: v }))}
        />

        <SaveButton
          onClick={() => mutation.mutate()}
          loading={mutation.isPending}
          saved={saved}
          error={mutation.isError}
        />
      </div>
    </Card>
  )
}

// ── Team Section ──────────────────────────────────────────────────────────────

function TeamSection({ boutiqueId }: { boutiqueId: string }) {
  const [showInvite, setShowInvite] = useState(false)
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', phone: '', role: 'EMPLOYEE' })
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery<{ employees: Employee[] }>({
    queryKey: ['employees', boutiqueId],
    queryFn: () => api.get(`/employees?boutiqueId=${boutiqueId}`).then(r => r.data),
    enabled: !!boutiqueId,
  })

  const inviteMutation = useMutation({
    mutationFn: () =>
      api.post('/employees', { ...inviteForm, boutiqueId }).then(r => r.data),
    onSuccess: () => {
      setShowInvite(false)
      setInviteForm({ name: '', email: '', phone: '', role: 'EMPLOYEE' })
      queryClient.invalidateQueries({ queryKey: ['employees'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/employees/${id}`).then(r => r.data),
    onSuccess: () => {
      setDeleteConfirm(null)
      queryClient.invalidateQueries({ queryKey: ['employees'] })
    },
  })

  const employees = data?.employees ?? []

  const ROLE_LABELS: Record<string, string> = {
    MERCHANT: 'Propriétaire',
    MANAGER: 'Manager',
    EMPLOYEE: 'Employé',
  }

  return (
    <Card title="Mon équipe" icon={<Users size={18} className="text-indigo-600" />}>
      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 size={20} className="animate-spin text-indigo-600" />
        </div>
      ) : (
        <div className="space-y-2 mb-4">
          {employees.map(emp => (
            <div key={emp.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
              <div>
                <p className="text-sm font-medium text-gray-900">{emp.name}</p>
                <p className="text-xs text-gray-500">
                  {ROLE_LABELS[emp.role] ?? emp.role}
                  {emp.email ? ` · ${emp.email}` : ''}
                  {emp.phone ? ` · ${emp.phone}` : ''}
                </p>
              </div>
              {deleteConfirm === emp.id ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => deleteMutation.mutate(emp.id)}
                    className="text-xs px-2.5 py-1 bg-red-500 text-white rounded-lg font-medium"
                  >
                    Confirmer
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="text-xs px-2.5 py-1 bg-gray-200 text-gray-700 rounded-lg font-medium"
                  >
                    Annuler
                  </button>
                </div>
              ) : (
                emp.role !== 'MERCHANT' && (
                  <button
                    onClick={() => setDeleteConfirm(emp.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                )
              )}
            </div>
          ))}
          {employees.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-3">Aucun membre d'équipe</p>
          )}
        </div>
      )}

      {showInvite ? (
        <div className="bg-gray-50 rounded-xl p-4 space-y-3">
          <p className="text-sm font-medium text-gray-700">Inviter un membre</p>
          <Input
            value={inviteForm.name}
            onChange={e => setInviteForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Nom complet *"
          />
          <Input
            type="email"
            value={inviteForm.email}
            onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))}
            placeholder="Email"
          />
          <Input
            type="tel"
            value={inviteForm.phone}
            onChange={e => setInviteForm(f => ({ ...f, phone: e.target.value }))}
            placeholder="Téléphone"
          />
          <select
            value={inviteForm.role}
            onChange={e => setInviteForm(f => ({ ...f, role: e.target.value }))}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="EMPLOYEE">Employé</option>
            <option value="MANAGER">Manager</option>
          </select>
          <div className="flex gap-2">
            <button
              onClick={() => inviteMutation.mutate()}
              disabled={!inviteForm.name || inviteMutation.isPending}
              className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {inviteMutation.isPending && <Loader2 size={14} className="animate-spin" />}
              Inviter
            </button>
            <button
              onClick={() => setShowInvite(false)}
              className="flex-1 py-2.5 bg-gray-200 text-gray-700 rounded-xl text-sm font-medium"
            >
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowInvite(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
        >
          <Plus size={15} />
          Inviter un membre
        </button>
      )}
    </Card>
  )
}

// ── Notifications ─────────────────────────────────────────────────────────────

function NotificationsSection({ boutiqueId, boutique }: { boutiqueId: string; boutique: any }) {
  const [form, setForm] = useState({
    notifEmail: boutique.notifEmail ?? false,
    notifSms: boutique.notifSms ?? false,
    notifPush: boutique.notifPush ?? false,
  })
  const [saved, setSaved] = useState(false)

  const mutation = useMutation({
    mutationFn: () =>
      api.patch(`/boutiques/${boutiqueId}/settings`, form).then(r => r.data),
    onSuccess: () => {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    },
  })

  return (
    <Card title="Notifications" icon={<Bell size={18} className="text-indigo-600" />}>
      <div className="space-y-4">
        <ToggleRow
          label="Notifications par email"
          description="Recevoir les alertes par email"
          checked={form.notifEmail}
          onChange={v => setForm(f => ({ ...f, notifEmail: v }))}
        />
        <ToggleRow
          label="Notifications SMS"
          description="Recevoir les alertes par SMS"
          checked={form.notifSms}
          onChange={v => setForm(f => ({ ...f, notifSms: v }))}
        />
        <ToggleRow
          label="Notifications push"
          description="Recevoir les notifications dans le navigateur"
          checked={form.notifPush}
          onChange={v => setForm(f => ({ ...f, notifPush: v }))}
        />
        <SaveButton
          onClick={() => mutation.mutate()}
          loading={mutation.isPending}
          saved={saved}
          error={mutation.isError}
        />
      </div>
    </Card>
  )
}

// ── Shared UI ─────────────────────────────────────────────────────────────────

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-5">
        {icon}
        <h2 className="font-semibold text-gray-900">{title}</h2>
      </div>
      {children}
    </div>
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

function ToggleRow({ label, description, checked, onChange }: {
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${checked ? 'bg-indigo-600' : 'bg-gray-300'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`}
        />
      </button>
    </div>
  )
}

function SaveButton({ onClick, loading, saved, error }: {
  onClick: () => void
  loading: boolean
  saved: boolean
  error: boolean
}) {
  return (
    <div>
      <button
        onClick={onClick}
        disabled={loading}
        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium disabled:opacity-60 hover:bg-indigo-700 transition-colors"
      >
        {loading ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
        Enregistrer
      </button>
      {saved && (
        <p className="flex items-center gap-1.5 text-xs text-green-600 mt-2">
          <CheckCircle size={13} /> Modifications enregistrées
        </p>
      )}
      {error && (
        <p className="text-xs text-red-500 mt-2">Erreur lors de la sauvegarde</p>
      )}
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
