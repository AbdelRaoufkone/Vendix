'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X, ChevronRight, ChevronLeft, Loader2, CheckCircle, ShoppingBag } from 'lucide-react'
import { api } from '@/lib/api'
import { formatCurrency } from '@/lib/format'
import { useCartStore } from '@/store/cart.store'

interface Props {
  open: boolean
  onClose: () => void
  boutiqueId: string
  themeColor?: string
}

const customerSchema = z.object({
  name: z.string().min(2, 'Le nom est requis'),
  phone: z.string().optional(),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  deliveryAddress: z.string().optional(),
  notes: z.string().optional(),
})

type CustomerValues = z.infer<typeof customerSchema>

export function OrderModal({ open, onClose, boutiqueId, themeColor }: Props) {
  const color = themeColor || '#6366f1'
  const { items, total, clear } = useCartStore()
  const [step, setStep] = useState<1 | 2>(1)
  const [submitting, setSubmitting] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [orderNumber, setOrderNumber] = useState<string | null>(null)
  const [customerData, setCustomerData] = useState<CustomerValues | null>(null)

  const { register, handleSubmit, formState: { errors } } = useForm<CustomerValues>({
    resolver: zodResolver(customerSchema),
  })

  const onStep1 = (values: CustomerValues) => {
    setCustomerData(values)
    setStep(2)
  }

  const onConfirm = async () => {
    if (!customerData) return
    setSubmitting(true)
    setApiError(null)
    try {
      const { data } = await api.post('/orders', {
        boutiqueId,
        customer: {
          name: customerData.name,
          phone: customerData.phone || undefined,
          email: customerData.email || undefined,
        },
        items: items.map(i => ({
          productId: i.productId,
          variantId: i.variantId,
          quantity: i.quantity,
        })),
        deliveryAddress: customerData.deliveryAddress || undefined,
        notes: customerData.notes || undefined,
      })
      setOrderNumber(data.order?.number ?? null)
      clear()
    } catch (err: any) {
      setApiError(err?.response?.data?.message ?? 'Une erreur est survenue.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    setStep(1)
    setOrderNumber(null)
    setApiError(null)
    setCustomerData(null)
    onClose()
  }

  if (!open) return null

  const isSuccess = !!orderNumber

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={handleClose} />

      <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            {step === 2 && !isSuccess && (
              <button onClick={() => setStep(1)} className="p-1 hover:bg-gray-100 rounded-lg mr-1">
                <ChevronLeft size={18} />
              </button>
            )}
            <h2 className="font-semibold text-gray-900">
              {isSuccess ? 'Commande confirmée !' : step === 1 ? 'Vos informations' : 'Confirmation'}
            </h2>
          </div>
          <button onClick={handleClose} className="p-1.5 hover:bg-gray-100 rounded-xl">
            <X size={18} />
          </button>
        </div>

        {/* Corps */}
        <div className="flex-1 overflow-y-auto px-5 py-4">

          {/* ── Succès ── */}
          {isSuccess && (
            <div className="flex flex-col items-center justify-center gap-5 py-8 text-center">
              <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
                <CheckCircle size={48} style={{ color }} />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-xl">Commande envoyée !</p>
                <p className="text-sm text-gray-500 mt-1">
                  Le commerçant vous contactera pour confirmer et organiser la livraison.
                </p>
              </div>
              {orderNumber && (
                <div className="bg-gray-50 rounded-2xl px-6 py-4 w-full">
                  <p className="text-xs text-gray-400 mb-1">Numéro de commande</p>
                  <p className="font-bold text-lg font-mono" style={{ color }}>{orderNumber}</p>
                  <p className="text-xs text-gray-400 mt-1">Gardez ce numéro pour le suivi</p>
                </div>
              )}
              <div className="w-full bg-gray-50 rounded-2xl px-5 py-3 text-left">
                <p className="text-xs text-gray-400 mb-2">Récapitulatif</p>
                {items.length === 0
                  ? <p className="text-sm text-gray-500">Panier vidé après confirmation</p>
                  : items.map(i => (
                    <div key={i.productId} className="flex justify-between text-sm py-0.5">
                      <span className="text-gray-700">{i.name} ×{i.quantity}</span>
                      <span className="font-medium text-gray-900">{formatCurrency(i.price * i.quantity)}</span>
                    </div>
                  ))
                }
              </div>
              <button
                onClick={handleClose}
                className="w-full py-3 text-white rounded-xl font-semibold text-sm transition-opacity hover:opacity-90"
                style={{ backgroundColor: color }}
              >
                Fermer
              </button>
            </div>
          )}

          {/* ── Étape 1 : infos client ── */}
          {!isSuccess && step === 1 && (
            <form id="step1-form" onSubmit={handleSubmit(onStep1)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom complet <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Votre nom"
                  {...register('name')}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                <input
                  type="tel"
                  placeholder="+225 07 00 00 00 00"
                  {...register('phone')}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  placeholder="exemple@email.com"
                  {...register('email')}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Adresse de livraison</label>
                <input
                  type="text"
                  placeholder="Quartier, rue, repère…"
                  {...register('deliveryAddress')}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes / Instructions</label>
                <textarea
                  rows={2}
                  placeholder="Instructions spéciales, couleur, taille…"
                  {...register('notes')}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>
            </form>
          )}

          {/* ── Étape 2 : récapitulatif ── */}
          {!isSuccess && step === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Articles</h3>
                <ul className="divide-y divide-gray-50">
                  {items.map(item => (
                    <li key={`${item.productId}-${item.variantId ?? ''}`} className="flex items-center justify-between py-2.5">
                      <div className="flex items-center gap-2">
                        {item.image && (
                          <img src={item.image} alt={item.name} className="w-8 h-8 rounded-lg object-cover" />
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-900">{item.name}</p>
                          <p className="text-xs text-gray-400">×{item.quantity}</p>
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">{formatCurrency(item.price * item.quantity)}</p>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <span className="font-semibold text-gray-900">Total</span>
                <span className="text-lg font-bold" style={{ color }}>{formatCurrency(total())}</span>
              </div>

              {customerData && (
                <div className="bg-gray-50 rounded-xl p-4 space-y-1 text-sm">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Vos infos</h3>
                  <p><span className="text-gray-500">Nom :</span> {customerData.name}</p>
                  {customerData.phone && <p><span className="text-gray-500">Tél :</span> {customerData.phone}</p>}
                  {customerData.email && <p><span className="text-gray-500">Email :</span> {customerData.email}</p>}
                  {customerData.deliveryAddress && <p><span className="text-gray-500">Adresse :</span> {customerData.deliveryAddress}</p>}
                </div>
              )}

              {apiError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                  {apiError}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!isSuccess && (
          <div className="px-5 py-4 border-t border-gray-100">
            {step === 1 ? (
              <button
                type="submit"
                form="step1-form"
                className="w-full flex items-center justify-center gap-2 py-3 text-white rounded-xl font-semibold text-sm transition-opacity hover:opacity-90"
                style={{ backgroundColor: color }}
              >
                Continuer <ChevronRight size={16} />
              </button>
            ) : (
              <button
                onClick={onConfirm}
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-3 text-white rounded-xl font-semibold text-sm disabled:opacity-60 transition-opacity hover:opacity-90"
                style={{ backgroundColor: color }}
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}
                <ShoppingBag size={16} />
                Confirmer la commande
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
