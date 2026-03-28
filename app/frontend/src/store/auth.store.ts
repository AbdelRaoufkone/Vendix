import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from '@/lib/api'

export interface User {
  id: string
  name: string
  email?: string
  phone?: string
  role: string
}

export interface Boutique {
  id: string
  name: string
  slug: string
}

interface AuthStore {
  user: User | null
  isAuthenticated: boolean
  boutiques: Boutique[]

  login: (credentials: { identifier: string; password: string }) => Promise<void>
  logout: () => void
  fetchMe: () => Promise<void>
  register: (data: {
    name: string
    email?: string
    phone?: string
    password: string
    role?: string
  }) => Promise<void>
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      boutiques: [],

      async login({ identifier, password }) {
        const { data } = await api.post('/auth/login', { identifier, password })
        if (typeof window !== 'undefined') {
          localStorage.setItem('vendix_token', data.accessToken)
          localStorage.setItem('vendix_refresh', data.refreshToken)
          // Cookie pour le middleware Next.js (pas httpOnly — lecture edge)
          document.cookie = `vendix_token=${data.accessToken}; path=/; max-age=900; SameSite=Lax`
        }
        set({
          user: data.user,
          isAuthenticated: true,
          boutiques: data.boutiques ?? [],
        })
      },

      logout() {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('vendix_token')
          localStorage.removeItem('vendix_refresh')
          document.cookie = 'vendix_token=; path=/; max-age=0'
        }
        set({ user: null, isAuthenticated: false, boutiques: [] })
      },

      async fetchMe() {
        try {
          const { data } = await api.get('/auth/me')
          set({
            user: data.user,
            isAuthenticated: true,
            boutiques: data.boutiques ?? [],
          })
        } catch {
          set({ user: null, isAuthenticated: false, boutiques: [] })
        }
      },

      async register(registerData) {
        const payload = { ...registerData, role: registerData.role ?? 'MERCHANT' }
        const { data } = await api.post('/auth/register', payload)
        if (typeof window !== 'undefined') {
          localStorage.setItem('vendix_token', data.accessToken)
          localStorage.setItem('vendix_refresh', data.refreshToken)
          document.cookie = `vendix_token=${data.accessToken}; path=/; max-age=900; SameSite=Lax`
        }
        set({
          user: data.user,
          isAuthenticated: true,
          boutiques: data.boutiques ?? [],
        })
      },
    }),
    {
      name: 'vendix-auth',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        boutiques: state.boutiques,
      }),
    }
  )
)
