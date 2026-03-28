'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ShoppingCart, MessageCircle, MapPin, Clock, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { api } from '@/lib/api'
import { useCartStore } from '@/store/cart.store'
import { ProductCard } from './ProductCard'
import { CartDrawer } from './CartDrawer'
import { ChatWidget } from './ChatWidget'
import { OrderModal } from './OrderModal'

interface Props {
  slug: string
}

// ── Banner Slider ─────────────────────────────────────────────────────────────

function BannerSlider({ images, color }: { images: string[]; color: string }) {
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    if (images.length <= 1) return
    const t = setInterval(() => setCurrent(c => (c + 1) % images.length), 4000)
    return () => clearInterval(t)
  }, [images.length])

  if (images.length === 0) return null

  return (
    <div className="relative h-44 overflow-hidden bg-gray-200">
      {images.map((img, i) => (
        <div
          key={i}
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-700"
          style={{ backgroundImage: `url(${img})`, opacity: i === current ? 1 : 0 }}
        />
      ))}
      {images.length > 1 && (
        <>
          <button
            onClick={() => setCurrent(c => (c - 1 + images.length) % images.length)}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/30 text-white rounded-full flex items-center justify-center backdrop-blur-sm"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => setCurrent(c => (c + 1) % images.length)}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/30 text-white rounded-full flex items-center justify-center backdrop-blur-sm"
          >
            <ChevronRight size={16} />
          </button>
          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className="w-2 h-2 rounded-full transition-all"
                style={{ backgroundColor: i === current ? color : 'rgba(255,255,255,0.6)' }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ── Main View ─────────────────────────────────────────────────────────────────

export function BoutiquePublicView({ slug }: Props) {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [showCart, setShowCart] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [showOrder, setShowOrder] = useState(false)
  const { items } = useCartStore()

  const { data, isLoading, error } = useQuery({
    queryKey: ['boutique', slug],
    queryFn: () => api.get(`/boutiques/public/${slug}`).then(r => r.data.boutique),
  })

  if (isLoading) return <BoutiqueSkeleton />
  if (error || !data) return <NotFound />

  const boutique = data
  const color = boutique.themeColor || '#6366f1'
  const cartCount = items.reduce((sum, i) => sum + i.quantity, 0)

  // Résoudre les bannières (nouveau champ banners[] ou ancien banner)
  const bannerImages: string[] = boutique.banners?.length
    ? boutique.banners
    : boutique.banner
    ? [boutique.banner]
    : []

  const filteredProducts = boutique.products.filter((p: any) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
    const matchCategory = !selectedCategory || p.categoryId === selectedCategory
    return matchSearch && matchCategory
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Bannière slider */}
      <BannerSlider images={bannerImages} color={color} />

      {/* Header boutique */}
      <div className="bg-white shadow-sm px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          {boutique.logo && (
            <img src={boutique.logo} alt={boutique.name} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900">{boutique.name}</h1>
            {boutique.description && (
              <p className="text-sm text-gray-500 line-clamp-2">{boutique.description}</p>
            )}
            <div className="flex items-center gap-3 mt-1">
              {boutique.city && (
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <MapPin size={12} /> {boutique.city}
                </span>
              )}
              <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                <Clock size={12} /> Ouvert
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Barre de recherche */}
      <div className="max-w-2xl mx-auto px-4 py-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un produit..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2"
            style={{ '--tw-ring-color': color } as any}
          />
        </div>
      </div>

      {/* Catégories */}
      {boutique.categories?.length > 0 && (
        <div className="max-w-2xl mx-auto px-4 pb-2">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory(null)}
              className="flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
              style={!selectedCategory
                ? { backgroundColor: color, color: 'white' }
                : { backgroundColor: 'white', color: '#4b5563', border: '1px solid #e5e7eb' }
              }
            >
              Tout
            </button>
            {boutique.categories.map((cat: any) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)}
                className="flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
                style={selectedCategory === cat.id
                  ? { backgroundColor: color, color: 'white' }
                  : { backgroundColor: 'white', color: '#4b5563', border: '1px solid #e5e7eb' }
                }
              >
                {cat.icon} {cat.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Grille produits */}
      <div className="max-w-2xl mx-auto px-4 pb-32">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg">Aucun produit trouvé</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredProducts.map((product: any) => (
              <ProductCard
                key={product.id}
                product={product}
                boutiqueColor={color}
              />
            ))}
          </div>
        )}
      </div>

      {/* Barre d'action fixe en bas */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 safe-bottom">
        <div className="max-w-2xl mx-auto flex gap-3">
          <button
            onClick={() => setShowChat(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium text-sm"
          >
            <MessageCircle size={18} /> Écrire
          </button>
          <button
            onClick={() => cartCount > 0 ? setShowOrder(true) : null}
            disabled={cartCount === 0}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 text-white rounded-xl font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-opacity hover:opacity-90"
            style={{ backgroundColor: color }}
          >
            <ShoppingCart size={18} />
            {cartCount > 0 ? `Commander (${cartCount})` : 'Panier vide'}
          </button>
          {cartCount > 0 && (
            <button
              onClick={() => setShowCart(true)}
              className="relative px-3 py-2.5 rounded-xl"
              style={{ backgroundColor: `${color}20`, color }}
            >
              <ShoppingCart size={18} />
              <span
                className="absolute -top-1 -right-1 w-4 h-4 text-white text-xs rounded-full flex items-center justify-center font-bold"
                style={{ backgroundColor: color }}
              >
                {cartCount}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Modals */}
      <CartDrawer
        open={showCart}
        onClose={() => setShowCart(false)}
        onCheckout={() => setShowOrder(true)}
        themeColor={color}
      />
      <ChatWidget
        open={showChat}
        onClose={() => setShowChat(false)}
        boutiqueId={boutique.id}
        boutiqueName={boutique.name}
        themeColor={color}
      />
      {showOrder && (
        <OrderModal
          open={showOrder}
          onClose={() => setShowOrder(false)}
          boutiqueId={boutique.id}
          themeColor={color}
        />
      )}
    </div>
  )
}

function BoutiqueSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 animate-pulse">
      <div className="h-44 bg-gray-200 mb-0" />
      <div className="h-20 bg-white mb-4" />
      <div className="max-w-2xl mx-auto px-4 grid grid-cols-2 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-48 bg-gray-200 rounded-xl" />
        ))}
      </div>
    </div>
  )
}

function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <p className="text-4xl mb-2">🏪</p>
        <h1 className="text-xl font-bold text-gray-800">Boutique introuvable</h1>
        <p className="text-gray-500 mt-1">Ce lien ne correspond à aucune boutique active.</p>
      </div>
    </div>
  )
}
