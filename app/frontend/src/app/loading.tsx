import { Loader2 } from 'lucide-react'

export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
      <div className="relative flex items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
        <Loader2 className="absolute h-8 w-8 animate-pulse text-primary" />
      </div>
      <p className="mt-4 animate-pulse font-medium text-gray-600">Chargement de VENDIX...</p>
    </div>
  )
}
