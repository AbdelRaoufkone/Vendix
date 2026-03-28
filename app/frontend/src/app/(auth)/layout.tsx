export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center px-4 py-12">
      <div className="mb-8 text-center">
        <span className="text-3xl font-black text-indigo-600 tracking-tight">VENDIX</span>
        <p className="text-sm text-gray-500 mt-1">La plateforme des commerçants modernes</p>
      </div>
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm p-6">
        {children}
      </div>
    </div>
  )
}
