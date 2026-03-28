import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

interface Boutique {
  id: string
  name: string
  slug: string
  description?: string
  phone?: string
  city?: string
  address?: string
  logo?: string
  banner?: string
  themeColor?: string
  currency?: string
  taxRate?: number
  loyaltyPoints?: boolean
  lowStockThreshold?: number
  notifEmail?: boolean
  notifSms?: boolean
  notifPush?: boolean
}

export function useBoutiqueId() {
  const { data: boutiques, isLoading, error } = useQuery<Boutique[]>({
    queryKey: ['boutiques', 'mine'],
    queryFn: () => api.get('/boutiques/mine').then(r => r.data.boutiques),
    staleTime: 5 * 60 * 1000,
  })

  const boutique = boutiques?.[0] ?? null
  const boutiqueId = boutique?.id ?? null

  return { boutiqueId, boutique, boutiques, isLoading, error }
}
