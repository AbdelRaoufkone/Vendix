'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'

const schema = z.object({
  identifier: z.string().min(1, "L'identifiant est requis"),
  password: z.string().min(1, 'Le mot de passe est requis'),
})

type FormValues = z.infer<typeof schema>

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuthStore()
  const [apiError, setApiError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = async (values: FormValues) => {
    setApiError(null)
    try {
      await login({ identifier: values.identifier, password: values.password })
      router.push('/dashboard')
    } catch (err: any) {
      const message =
        err?.response?.data?.message ?? 'Identifiants incorrects. Veuillez réessayer.'
      setApiError(message)
    }
  }

  return (
    <>
      <h1 className="text-xl font-bold text-gray-900 mb-1">Connexion</h1>
      <p className="text-sm text-gray-500 mb-6">Bienvenue ! Connectez-vous à votre espace.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email ou téléphone
          </label>
          <input
            type="text"
            placeholder="exemple@email.com ou +225…"
            {...register('identifier')}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {errors.identifier && (
            <p className="text-xs text-red-500 mt-1">{errors.identifier.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
          <input
            type="password"
            placeholder="••••••••"
            {...register('password')}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {errors.password && (
            <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>
          )}
        </div>

        {apiError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
            {apiError}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold text-sm disabled:opacity-60 hover:bg-indigo-700 transition-colors"
        >
          {isSubmitting && <Loader2 size={16} className="animate-spin" />}
          Se connecter
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-6">
        Pas encore de compte ?{' '}
        <Link href="/register" className="text-indigo-600 font-medium hover:underline">
          Créer un compte
        </Link>
      </p>
    </>
  )
}
