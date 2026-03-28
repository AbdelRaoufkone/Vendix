'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Search, MoreVertical, Package, X, Loader2,
  AlertCircle, Edit, TrendingDown, ToggleLeft, Tag
} from 'lucide-react'
import { api } from '@/lib/api'
import { formatCurrency } from '@/lib/format'
import { useBoutiqueId } from '@/hooks/useBoutiqueId'
import { ImageUploader } from '@/components/ui/ImageUploader'

// ── Types ────────────────────────────────────────────────────────────────────

interface Category {
  id: string
  name: string
  emoji?: string
}

interface Product {
  id: string
  name: string
  description?: string
  price: number
  promoPrice?: number
  purchasePrice?: number
  stock: number
  alertThreshold?: number
  images: string[]
  isActive: boolean
  categoryId?: string
  category?: Category
}

interface ProductForm {
  name: string
  description: string
  categoryId: string
  price: string
  promoPrice: string
  purchasePrice: string
  stock: string
  alertThreshold: string
  images: string[]
}

const EMPTY_FORM: ProductForm = {
  name: '', description: '', categoryId: '', price: '',
  promoPrice: '', purchasePrice: '', stock: '', alertThreshold: '', images: [],
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function ProduitsPage() {
  const { boutiqueId, isLoading: loadingBoutique } = useBoutiqueId()
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')
  const [productModal, setProductModal] = useState<{ open: boolean; product?: Product }>({ open: false })
  const [stockModal, setStockModal] = useState<Product | null>(null)
  const [categoryModal, setCategoryModal] = useState(false)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const categoriesQuery = useQuery<Category[]>({
    queryKey: ['categories', boutiqueId],
    queryFn: () => api.get(`/categories?boutiqueId=${boutiqueId}`).then(r => r.data.categories ?? r.data),
    enabled: !!boutiqueId,
  })

  const productsQuery = useQuery<Product[]>({
    queryKey: ['products', boutiqueId, search, selectedCategory],
    queryFn: () => {
      const params = new URLSearchParams({ boutiqueId: boutiqueId! })
      if (search) params.set('search', search)
      if (selectedCategory !== 'ALL') params.set('categoryId', selectedCategory)
      return api.get(`/products?${params}`).then(r => r.data.products ?? r.data)
    },
    enabled: !!boutiqueId,
  })

  const toggleActiveMutation = useMutation({
    mutationFn: (product: Product) =>
      api.patch(`/products/${product.id}`, { isActive: !product.isActive }).then(r => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  })

  // Close menu on outside click
  useEffect(() => {
    const handler = () => setOpenMenuId(null)
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  if (loadingBoutique) return <LoadingScreen />

  const categories = categoriesQuery.data ?? []
  const products = productsQuery.data ?? []

  return (
    <div className="p-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-gray-900">Produits</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setCategoryModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            <Tag size={15} />
            Catégorie
          </button>
          <button
            onClick={() => setProductModal({ open: true })}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            <Plus size={16} />
            Ajouter
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher un produit..."
          className="w-full pl-9 pr-4 py-2.5 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-1 px-1">
        <button
          onClick={() => setSelectedCategory('ALL')}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            selectedCategory === 'ALL' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Toutes
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              selectedCategory === cat.id ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {cat.emoji} {cat.name}
          </button>
        ))}
      </div>

      {/* Grid */}
      {productsQuery.isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={28} className="animate-spin text-indigo-600" />
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Package size={40} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">Aucun produit trouvé</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {products.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              isMenuOpen={openMenuId === product.id}
              onMenuToggle={(e) => {
                e.stopPropagation()
                setOpenMenuId(openMenuId === product.id ? null : product.id)
              }}
              onEdit={() => { setProductModal({ open: true, product }); setOpenMenuId(null) }}
              onAdjustStock={() => { setStockModal(product); setOpenMenuId(null) }}
              onToggleActive={() => { toggleActiveMutation.mutate(product); setOpenMenuId(null) }}
            />
          ))}
        </div>
      )}

      {/* Product Modal */}
      {productModal.open && (
        <ProductModal
          product={productModal.product}
          boutiqueId={boutiqueId!}
          categories={categories}
          onClose={() => setProductModal({ open: false })}
          onSuccess={() => {
            setProductModal({ open: false })
            queryClient.invalidateQueries({ queryKey: ['products'] })
          }}
        />
      )}

      {/* Stock Modal */}
      {stockModal && (
        <StockModal
          product={stockModal}
          onClose={() => setStockModal(null)}
          onSuccess={() => {
            setStockModal(null)
            queryClient.invalidateQueries({ queryKey: ['products'] })
          }}
        />
      )}

      {/* Category Modal */}
      {categoryModal && (
        <CategoryModal
          boutiqueId={boutiqueId!}
          onClose={() => setCategoryModal(false)}
          onSuccess={() => {
            setCategoryModal(false)
            queryClient.invalidateQueries({ queryKey: ['categories'] })
          }}
        />
      )}
    </div>
  )
}

// ── ProductCard ───────────────────────────────────────────────────────────────

function ProductCard({
  product, isMenuOpen, onMenuToggle, onEdit, onAdjustStock, onToggleActive
}: {
  product: Product
  isMenuOpen: boolean
  onMenuToggle: (e: React.MouseEvent) => void
  onEdit: () => void
  onAdjustStock: () => void
  onToggleActive: () => void
}) {
  const stockColor =
    product.stock <= 5 ? 'text-red-600 bg-red-50' :
    product.stock <= 15 ? 'text-orange-600 bg-orange-50' :
    'text-green-600 bg-green-50'

  return (
    <div className={`bg-white rounded-xl border border-gray-100 overflow-hidden ${!product.isActive ? 'opacity-60' : ''}`}>
      {/* Image */}
      <div className="aspect-square bg-gray-100 relative">
        {product.images?.[0] ? (
          <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <Package size={32} />
          </div>
        )}
        {/* Menu button */}
        <div className="absolute top-1.5 right-1.5">
          <button
            onClick={onMenuToggle}
            className="p-1.5 bg-white/90 rounded-lg shadow-sm text-gray-600 hover:text-gray-900"
          >
            <MoreVertical size={14} />
          </button>
          {isMenuOpen && (
            <div className="absolute right-0 top-8 bg-white rounded-xl shadow-lg border border-gray-100 z-10 min-w-[140px]">
              <button onClick={onEdit} className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-t-xl">
                <Edit size={14} /> Modifier
              </button>
              <button onClick={onAdjustStock} className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                <TrendingDown size={14} /> Ajuster stock
              </button>
              <button onClick={onToggleActive} className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-b-xl">
                <ToggleLeft size={14} /> {product.isActive ? 'Désactiver' : 'Activer'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="font-semibold text-sm text-gray-900 truncate">{product.name}</p>
        <p className="text-sm font-bold text-indigo-600 mt-0.5">{formatCurrency(product.price)}</p>
        <div className="flex items-center justify-between mt-2">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${stockColor}`}>
            {product.stock} en stock
          </span>
          {product.category && (
            <span className="text-xs text-gray-400 truncate ml-1">{product.category.name}</span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── ProductModal ──────────────────────────────────────────────────────────────

function ProductModal({ product, boutiqueId, categories, onClose, onSuccess }: {
  product?: Product
  boutiqueId: string
  categories: Category[]
  onClose: () => void
  onSuccess: () => void
}) {
  const isEdit = !!product
  const [form, setForm] = useState<ProductForm>(
    product ? {
      name: product.name,
      description: product.description ?? '',
      categoryId: product.categoryId ?? '',
      price: String(product.price),
      promoPrice: String(product.promoPrice ?? ''),
      purchasePrice: String(product.purchasePrice ?? ''),
      stock: String(product.stock),
      alertThreshold: String(product.alertThreshold ?? ''),
      images: product.images ?? [],
    } : { ...EMPTY_FORM }
  )

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: form.name,
        description: form.description || undefined,
        categoryId: form.categoryId || undefined,
        price: parseFloat(form.price),
        promoPrice: form.promoPrice ? parseFloat(form.promoPrice) : undefined,
        purchasePrice: form.purchasePrice ? parseFloat(form.purchasePrice) : undefined,
        stock: parseInt(form.stock) || 0,
        alertThreshold: form.alertThreshold ? parseInt(form.alertThreshold) : undefined,
        images: form.images,
        boutiqueId,
      }
      return isEdit
        ? api.patch(`/products/${product!.id}`, payload).then(r => r.data)
        : api.post('/products', payload).then(r => r.data)
    },
    onSuccess,
  })

  const field = (key: keyof ProductForm) => ({
    value: form[key] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value })),
  })

  return (
    <Modal title={isEdit ? 'Modifier le produit' : 'Ajouter un produit'} onClose={onClose} wide>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label>Nom du produit *</Label>
            <Input {...field('name')} placeholder="Ex: T-shirt premium" />
          </div>
          <div className="col-span-2">
            <Label>Description</Label>
            <textarea
              {...field('description')}
              placeholder="Description du produit..."
              rows={2}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>
          <div className="col-span-2">
            <Label>Catégorie</Label>
            <select
              {...field('categoryId')}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="">Sans catégorie</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Prix de vente *</Label>
            <Input type="number" {...field('price')} placeholder="0" />
          </div>
          <div>
            <Label>Prix promo</Label>
            <Input type="number" {...field('promoPrice')} placeholder="0" />
          </div>
          <div>
            <Label>Prix d'achat</Label>
            <Input type="number" {...field('purchasePrice')} placeholder="0" />
          </div>
          <div>
            <Label>Stock initial</Label>
            <Input type="number" {...field('stock')} placeholder="0" />
          </div>
          <div className="col-span-2">
            <Label>Seuil d'alerte stock</Label>
            <Input type="number" {...field('alertThreshold')} placeholder="Ex: 5" />
          </div>
        </div>

        <div>
          <Label>Photos</Label>
          <ImageUploader
            images={form.images}
            onChange={imgs => setForm(f => ({ ...f, images: imgs }))}
            max={4}
          />
        </div>

        {mutation.isError && (
          <p className="text-sm text-red-500">Erreur lors de la sauvegarde</p>
        )}

        <button
          onClick={() => mutation.mutate()}
          disabled={!form.name || !form.price || mutation.isPending}
          className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {mutation.isPending && <Loader2 size={16} className="animate-spin" />}
          {isEdit ? 'Enregistrer les modifications' : 'Créer le produit'}
        </button>
      </div>
    </Modal>
  )
}

// ── StockModal ────────────────────────────────────────────────────────────────

function StockModal({ product, onClose, onSuccess }: {
  product: Product
  onClose: () => void
  onSuccess: () => void
}) {
  const [adjustment, setAdjustment] = useState('')
  const [reason, setReason] = useState('')

  const mutation = useMutation({
    mutationFn: () =>
      api.post(`/products/${product.id}/stock`, {
        adjustment: parseInt(adjustment),
        reason: reason || undefined,
      }).then(r => r.data),
    onSuccess,
  })

  const newStock = product.stock + (parseInt(adjustment) || 0)

  return (
    <Modal title={`Ajuster stock — ${product.name}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="bg-gray-50 rounded-xl p-4 flex justify-between">
          <span className="text-sm text-gray-500">Stock actuel</span>
          <span className="font-bold text-gray-900">{product.stock}</span>
        </div>
        <div>
          <Label>Ajustement (+/-)</Label>
          <Input
            type="number"
            value={adjustment}
            onChange={e => setAdjustment(e.target.value)}
            placeholder="Ex: +10 ou -3"
          />
          {adjustment && (
            <p className="text-xs text-gray-500 mt-1">
              Nouveau stock : <span className={`font-semibold ${newStock < 0 ? 'text-red-500' : 'text-gray-900'}`}>{newStock}</span>
            </p>
          )}
        </div>
        <div>
          <Label>Motif</Label>
          <Input
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Ex: Livraison reçue, casse, inventaire..."
          />
        </div>
        <button
          onClick={() => mutation.mutate()}
          disabled={!adjustment || mutation.isPending}
          className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {mutation.isPending && <Loader2 size={16} className="animate-spin" />}
          Appliquer l'ajustement
        </button>
      </div>
    </Modal>
  )
}

// ── CategoryModal ─────────────────────────────────────────────────────────────

function CategoryModal({ boutiqueId, onClose, onSuccess }: {
  boutiqueId: string
  onClose: () => void
  onSuccess: () => void
}) {
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('')

  const mutation = useMutation({
    mutationFn: () =>
      api.post('/categories', { name, emoji: emoji || undefined, boutiqueId }).then(r => r.data),
    onSuccess,
  })

  return (
    <Modal title="Ajouter une catégorie" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <Label>Nom *</Label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Vêtements" />
        </div>
        <div>
          <Label>Emoji (optionnel)</Label>
          <Input value={emoji} onChange={e => setEmoji(e.target.value)} placeholder="Ex: 👗" />
        </div>
        <button
          onClick={() => mutation.mutate()}
          disabled={!name || mutation.isPending}
          className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {mutation.isPending && <Loader2 size={16} className="animate-spin" />}
          Créer la catégorie
        </button>
      </div>
    </Modal>
  )
}

// ── Shared UI ─────────────────────────────────────────────────────────────────

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
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className={`fixed inset-x-4 top-1/2 -translate-y-1/2 bg-white rounded-2xl z-50 p-6 shadow-2xl overflow-y-auto max-h-[90vh] ${wide ? 'max-w-lg' : 'max-w-sm'} mx-auto`}>
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
