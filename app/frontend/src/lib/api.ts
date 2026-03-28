import axios from 'axios'

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL + '/api',
  withCredentials: true,
})

// Injecter le token automatiquement
api.interceptors.request.use(config => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('vendix_token') : null
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Refresh token automatique si 401
api.interceptors.response.use(
  res => res,
  async error => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const refreshToken = localStorage.getItem('vendix_refresh')
        const { data } = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/refresh`, { refreshToken })
        localStorage.setItem('vendix_token', data.accessToken)
        document.cookie = `vendix_token=${data.accessToken}; path=/; max-age=900; SameSite=Lax`
        return api(original)
      } catch {
        localStorage.removeItem('vendix_token')
        localStorage.removeItem('vendix_refresh')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)
