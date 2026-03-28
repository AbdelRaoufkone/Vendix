'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useAuthStore } from '@/store/auth.store'

type ContactMode = 'email' | 'phone'

const baseSchema = z.object({
  name: z.string().min(2, 'Le nom est requis (min 2 caractères)'),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
  confirmPassword: z.string(),
  contactMode: z.enum(['email', 'phone']),
  email: z.string().optional(),
  phone: z.string().optional(),
})

const schema = baseSchema
  .refine(data => data.password === data.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  })
  .refine(
    data =>
      data.contactMode === 'email'
        ? !!data.email && data.email.includes('@')
        : !!data.phone && data.phone.length >= 8,
    {
      message: 'Veuillez saisir un contact valide',
      path: ['email'],
    }
  )

type FormValues = z.infer<typeof schema>

export default function RegisterPage() {
  const router = useRouter()
  const { register: registerUser } = useAuthStore()
  const [apiError, setApiError] = useState<string | null>(null)
  const [contactMode, setContactMode] = useState<ContactMode>('email')

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { contactMode: 'email' },
  })

  const switchMode = (mode: ContactMode) => {
    setContactMode(mode)
    setValue('contactMode', mode)
    setValue('email', '')
    setValue('phone', '')
  }

  const onSubmit = async (values: FormValues) => {
    setApiError(null)
    try {
      await registerUser({
        name: values.name,
        email: values.contactMode === 'email' ? values.email : undefined,
        phone: values.contactMode === 'phone' ? values.phone : undefined,
        password: values.password,
        role: 'MERCHANT',
      })
      router.push('/dashboard')
    } catch (err: any) {
      const message =
        err?.response?.data?.message ?? 'Une erreur est survenue. Veuillez réessayer.'
      setApiError(message)
    }
  }

  return (
    <>
      <h1 className="text-xl font-bold text-gray-900 mb-1">Créer mon compte</h1>
      <p className="text-sm text-gray-500 mb-6">Rejoignez VENDIX et lancez votre boutique.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Nom */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet</label>
          <input
            type="text"
            placeholder="Kofi Mensah"
            {...register('name')}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
        </div>

        {/* Tabs email / téléphone */}
        <div>
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-3">
            <button
              type="button"
              onClick={() => switchMode('email')}
              className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                contactMode === 'email'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Email
            </button>
            <button
              type="button"
              onClick={() => switchMode('phone')}
              className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                contactMode === 'phone'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Téléphone
            </button>
          </div>

          {contactMode === 'email' ? (
            <input
              type="email"
              placeholder="exemple@email.com"
              {...register('email')}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          ) : (
            <input
              type="tel"
              placeholder="+225 07 00 00 00 00"
              {...register('phone')}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          )}
          {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
        </div>

        {/* Mot de passe */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
          <input
            type="password"
            placeholder="Minimum 6 caractères"
            {...register('password')}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {errors.password && (
            <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>
          )}
        </div>

        {/* Confirmer */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Confirmer le mot de passe
          </label>
          <input
            type="password"
            placeholder="••••••••"
            {...register('confirmPassword')}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {errors.confirmPassword && (
            <p className="text-xs text-red-500 mt-1">{errors.confirmPassword.message}</p>
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
          Créer mon compte
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-6">
        J&apos;ai déjà un compte ?{' '}
        <Link href="/login" className="text-indigo-600 font-medium hover:underline">
          Se connecter
        </Link>
      </p>
    </>
  )
}
