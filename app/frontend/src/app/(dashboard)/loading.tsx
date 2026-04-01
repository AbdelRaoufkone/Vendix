import { Loader2 } from 'lucide-react'

export default function DashboardLoading() {
  return (
    <div className="flex min-h-[400px] w-full flex-col items-center justify-center space-y-4 animate-in fade-in duration-500">
      <div className="relative">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-indigo-100 border-t-indigo-600" />
        <Loader2 className="absolute inset-0 m-auto h-5 w-5 animate-pulse text-indigo-600" />
      </div>
      <div className="flex flex-col items-center space-y-1">
        <p className="text-sm font-medium text-gray-500 italic">Préparation de vos données...</p>
        <div className="flex space-x-1">
          <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:-0.3s]" />
          <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:-0.15s]" />
          <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400" />
        </div>
      </div>
    </div>
  )
}
