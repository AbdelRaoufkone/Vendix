import { Metadata } from 'next'
import { BoutiquePublicView } from '@/components/boutique/BoutiquePublicView'

interface Props {
  params: { slug: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/boutiques/public/${params.slug}`, {
    next: { revalidate: 60 },
  }).catch(() => null)

  if (!res?.ok) return { title: 'Boutique introuvable' }

  const { boutique } = await res.json()
  return {
    title: `${boutique.name} — VENDIX`,
    description: boutique.description || `Commandez chez ${boutique.name}`,
    openGraph: {
      title: boutique.name,
      description: boutique.description,
      images: boutique.banner ? [boutique.banner] : [],
    },
  }
}

export default function BoutiquePage({ params }: Props) {
  return <BoutiquePublicView slug={params.slug} />
}
