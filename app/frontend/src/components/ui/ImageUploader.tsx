'use client'

import { useRef, useState } from 'react'
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react'
import { compressToBase64, validateImageFile, base64SizeKB } from '@/lib/image'

interface Props {
  images: string[]          // base64 strings actuels
  onChange: (images: string[]) => void
  max?: number              // nombre max d'images (défaut 4)
  disabled?: boolean
}

export function ImageUploader({ images, onChange, max = 4, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFiles = async (files: FileList) => {
    setError(null)
    const remaining = max - images.length
    if (remaining <= 0) return

    const selected = Array.from(files).slice(0, remaining)
    setLoading(true)

    try {
      const compressed = await Promise.all(
        selected.map(async (file) => {
          const err = validateImageFile(file)
          if (err) throw new Error(err)
          return compressToBase64(file, { maxWidth: 900, maxHeight: 900, quality: 0.75 })
        })
      )
      onChange([...images, ...compressed])
    } catch (e: any) {
      setError(e.message ?? 'Erreur lors du traitement de l\'image')
    } finally {
      setLoading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const remove = (idx: number) => {
    onChange(images.filter((_, i) => i !== idx))
  }

  return (
    <div className="space-y-3">
      {/* Grille d'aperçu */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {images.map((src, idx) => (
            <div key={idx} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 group">
              <img src={src} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => remove(idx)}
                  className="p-1.5 bg-red-500 text-white rounded-full"
                >
                  <X size={14} />
                </button>
              </div>
              {/* Taille de l'image */}
              <span className="absolute bottom-1 right-1 text-[10px] bg-black/60 text-white px-1.5 rounded">
                {base64SizeKB(src)}KB
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Zone d'upload */}
      {images.length < max && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || loading}
          className="w-full border-2 border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center gap-2 text-gray-400 hover:border-indigo-400 hover:text-indigo-500 transition-colors disabled:opacity-50"
        >
          {loading ? (
            <Loader2 size={24} className="animate-spin" />
          ) : (
            <Upload size={24} />
          )}
          <span className="text-sm">
            {loading
              ? 'Compression en cours...'
              : `Ajouter des photos (${images.length}/${max})`}
          </span>
          <span className="text-xs text-gray-300">
            Toutes les images sont compressées automatiquement
          </span>
        </button>
      )}

      {error && (
        <p className="text-sm text-red-500 flex items-center gap-1">
          <X size={14} /> {error}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={e => e.target.files && handleFiles(e.target.files)}
      />
    </div>
  )
}
