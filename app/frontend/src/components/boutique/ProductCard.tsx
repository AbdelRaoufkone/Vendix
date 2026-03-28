'use client'

import { Plus } from 'lucide-react'
import { formatCurrency } from '@/lib/format'
import { useCartStore } from '@/store/cart.store'

interface Variant {
  id: string
  name: string
  price?: number
}

interface Product {
  id: string
  name: string
  images: string[]
  price: number
  promoPrice?: number | null
  stock: number
  variants?: Variant[]
}

interface Props {
  product: Product
  boutiqueColor?: string
}

export function ProductCard({ product, boutiqueColor }: Props) {
  const addItem = useCartStore(s => s.addItem)
  const isOutOfStock = product.stock === 0
  const hasPromo = !!product.promoPrice && product.promoPrice < product.price
  const displayPrice = hasPromo ? product.promoPrice! : product.price
  const firstImage = product.images?.[0] ?? null

  const handleAdd = () => {
    if (isOutOfStock) return
    addItem({
      productId: product.id,
      name: product.name,
      price: displayPrice,
      image: firstImage ?? undefined,
    })
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col">
      {/* Image */}
      <div className="aspect-square relative bg-gray-100 overflow-hidden">
        {firstImage ? (
          <img
            src={firstImage}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-10 h-10"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {hasPromo && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              Promo
            </span>
          )}
          {isOutOfStock && (
            <span className="bg-gray-700 text-white text-xs font-medium px-2 py-0.5 rounded-full">
              Rupture
            </span>
          )}
        </div>
      </div>

      {/* Infos */}
      <div className="p-3 flex flex-col gap-2 flex-1">
        <p className="text-sm font-medium text-gray-900 line-clamp-2 leading-snug">
          {product.name}
        </p>

        {/* Prix */}
        <div className="flex items-center gap-1.5 flex-wrap mt-auto">
          <span
            className="text-sm font-bold"
            style={{ color: boutiqueColor ?? '#4f46e5' }}
          >
            {formatCurrency(displayPrice)}
          </span>
          {hasPromo && (
            <span className="text-xs text-gray-400 line-through">
              {formatCurrency(product.price)}
            </span>
          )}
        </div>

        {/* Bouton ajouter */}
        <button
          onClick={handleAdd}
          disabled={isOutOfStock}
          className="mt-1 w-full flex items-center justify-center gap-1.5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-indigo-700 transition-colors"
        >
          <Plus size={14} />
          {isOutOfStock ? 'Indisponible' : 'Ajouter'}
        </button>
      </div>
    </div>
  )
}
