import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  productId: string
  variantId?: string
  name: string
  price: number
  image?: string
  quantity: number
}

interface CartStore {
  items: CartItem[]
  addItem: (item: Omit<CartItem, 'quantity'>) => void
  removeItem: (productId: string, variantId?: string) => void
  updateQty: (productId: string, quantity: number, variantId?: string) => void
  clear: () => void
  total: () => number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem(item) {
        set(state => {
          const idx = state.items.findIndex(
            i => i.productId === item.productId && i.variantId === item.variantId
          )
          if (idx >= 0) {
            const items = [...state.items]
            items[idx] = { ...items[idx], quantity: items[idx].quantity + 1 }
            return { items }
          }
          return { items: [...state.items, { ...item, quantity: 1 }] }
        })
      },

      removeItem(productId, variantId) {
        set(state => ({
          items: state.items.filter(
            i => !(i.productId === productId && i.variantId === variantId)
          ),
        }))
      },

      updateQty(productId, quantity, variantId) {
        if (quantity <= 0) return get().removeItem(productId, variantId)
        set(state => ({
          items: state.items.map(i =>
            i.productId === productId && i.variantId === variantId
              ? { ...i, quantity }
              : i
          ),
        }))
      },

      clear() {
        set({ items: [] })
      },

      total() {
        return get().items.reduce((sum, i) => sum + i.price * i.quantity, 0)
      },
    }),
    { name: 'vendix-cart' }
  )
)
