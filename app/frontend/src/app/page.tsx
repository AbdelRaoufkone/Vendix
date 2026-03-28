import Link from 'next/link'
import {
  ShoppingBag,
  MessageCircle,
  BarChart2,
  QrCode,
  Package,
  ArrowRight,
} from 'lucide-react'

const FEATURES = [
  {
    icon: <ShoppingBag size={24} className="text-indigo-600" />,
    title: 'Boutique en ligne',
    desc: 'Votre catalogue toujours disponible, accessible par lien ou QR code — sans application.',
  },
  {
    icon: <MessageCircle size={24} className="text-indigo-600" />,
    title: 'Chat intégré',
    desc: 'Répondez à vos clients directement depuis votre tableau de bord, en temps réel.',
  },
  {
    icon: <BarChart2 size={24} className="text-indigo-600" />,
    title: 'Suivi des ventes',
    desc: 'Statistiques claires : chiffre du jour, commandes en cours, produits populaires.',
  },
  {
    icon: <QrCode size={24} className="text-indigo-600" />,
    title: 'QR Code partageable',
    desc: 'Imprimez votre QR code et permettez à vos clients de commander en scannant.',
  },
  {
    icon: <Package size={24} className="text-indigo-600" />,
    title: 'Gestion du stock',
    desc: "Suivez vos niveaux de stock, recevez des alertes de rupture et gérez vos fournisseurs.",
  },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 text-white">
        <div className="max-w-2xl mx-auto px-6 py-20 text-center">
          <span className="text-5xl font-black tracking-tight">VENDIX</span>
          <p className="mt-4 text-xl text-indigo-100 font-medium">
            La plateforme des commerçants modernes
          </p>
          <p className="mt-3 text-indigo-200 text-base leading-relaxed max-w-md mx-auto">
            Remplacez WhatsApp Business par une vraie boutique en ligne. Gérez vos commandes,
            votre stock et vos clients — tout en un.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
            <Link
              href="/register"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-white text-indigo-700 rounded-xl font-bold text-sm hover:bg-indigo-50 transition-colors"
            >
              Créer ma boutique <ArrowRight size={16} />
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-indigo-500 bg-opacity-50 text-white border border-indigo-400 rounded-xl font-semibold text-sm hover:bg-opacity-70 transition-colors"
            >
              Me connecter
            </Link>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-2xl mx-auto px-6 py-16">
        <h2 className="text-center text-2xl font-bold text-gray-900 mb-2">
          Tout ce dont vous avez besoin
        </h2>
        <p className="text-center text-gray-500 text-sm mb-10">
          Plus efficace que WhatsApp, conçu pour les commerçants africains.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FEATURES.map((feat) => (
            <div key={feat.title} className="bg-gray-50 rounded-2xl p-5 flex gap-4 items-start">
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
                {feat.icon}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">{feat.title}</h3>
                <p className="text-gray-500 text-xs mt-1 leading-relaxed">{feat.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA bottom */}
      <div className="bg-indigo-50 border-t border-indigo-100">
        <div className="max-w-2xl mx-auto px-6 py-12 text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Prêt à moderniser votre commerce ?
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            Inscription gratuite. Boutique en ligne en moins de 5 minutes.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors"
          >
            Commencer gratuitement <ArrowRight size={16} />
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-6 text-center text-xs text-gray-400">
        &copy; {new Date().getFullYear()} VENDIX &mdash; Tous droits réservés
      </footer>
    </div>
  )
}
