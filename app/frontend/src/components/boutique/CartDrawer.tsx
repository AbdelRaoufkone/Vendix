'use client'

import { X, ShoppingCart, Trash2, Plus, Minus } from 'lucide-react'
import { formatCurrency } from '@/lib/format'
import { useCartStore } from '@/store/cart.store'

interface Props {
  open: boolean
  onClose: () => void
  onCheckout?: () => void
  themeColor?: string
}

export function CartDrawer({ open, onClose, onCheckout, themeColor }: Props) {
  const color = themeColor || '#6366f1'
  const { items, removeItem, updateQty, total } = useCartStore()

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 z-40"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-sm bg-white z-50 flex flex-col shadow-xl transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <ShoppingCart size={20} style={{ color }} />
            <h2 className="font-semibold text-gray-900">Mon panier</h2>
            {items.length > 0 && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${color}20`, color }}>
                {items.reduce((s, i) => s + i.quantity, 0)}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Contenu */}
        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
              <ShoppingCart size={48} className="opacity-20" />
              <p className="text-sm">Votre panier est vide</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-50 px-4 py-2">
              {items.map(item => (
                <li key={`${item.productId}-${item.variantId ?? ''}`} className="py-4 flex gap-3">
                  {/* Miniature */}
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200" />
                    )}
                  </div>

                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                    <p className="text-sm text-indigo-600 font-semibold mt-0.5">
                      {formatCurrency(item.price)}
                    </p>

                    {/* Quantité */}
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() =>
                          updateQty(item.productId, item.quantity - 1, item.variantId)
                        }
                        className="w-7 h-7 flex items-center justify-center bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="text-sm font-bold w-5 text-center">{item.quantity}</span>
                      <button
                        onClick={() =>
                          updateQty(item.productId, item.quantity + 1, item.variantId)
                        }
                        className="w-7 h-7 flex items-center justify-center bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Supprimer */}
                  <button
                    onClick={() => removeItem(item.productId, item.variantId)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors self-start"
                  >
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer total + commander */}
        {items.length > 0 && (
          <div className="border-t border-gray-100 px-4 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Total</span>
              <span className="text-lg font-bold text-gray-900">{formatCurrency(total())}</span>
            </div>
            <button
              onClick={() => {
                onClose()
                onCheckout?.()
              }}
              className="w-full py-3 text-white rounded-xl font-semibold text-sm transition-opacity hover:opacity-90"
              style={{ backgroundColor: color }}
            >
              Commander
            </button>
          </div>
        )}
      </div>
    </>
  )
}
