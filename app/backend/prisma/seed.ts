import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(__dirname, '../.env') })

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding VENDIX...')

  // ── Utilisateur admin / commerçant ─────────────────────────────────────────
  const hashed = await bcrypt.hash('admin123', 12)

  const user = await prisma.user.upsert({
    where: { email: 'admin@vendix.com' },
    update: {},
    create: {
      name: 'Admin VENDIX',
      email: 'admin@vendix.com',
      password: hashed,
      role: 'MERCHANT',
      isVerified: true,
    },
  })

  console.log(`✓ Utilisateur : ${user.email} / admin123`)

  // ── Boutique de démo ───────────────────────────────────────────────────────
  const boutique = await prisma.boutique.upsert({
    where: { slug: 'demo-boutique' },
    update: {},
    create: {
      name: 'Boutique Démo',
      slug: 'demo-boutique',
      description: 'Boutique de démonstration VENDIX',
      city: 'Dakar',
      phone: '+221 77 000 00 00',
      themeColor: '#6366f1',
      ownerId: user.id,
      settings: { create: { currency: 'XOF' } },
    },
  })

  console.log(`✓ Boutique : /boutique/${boutique.slug}`)

  // ── Catégories ─────────────────────────────────────────────────────────────
  const [catVetements, catAccessoires] = await Promise.all([
    prisma.category.upsert({
      where: { id: 'cat-vetements' },
      update: {},
      create: { id: 'cat-vetements', boutiqueId: boutique.id, name: 'Vêtements', icon: '👗' },
    }),
    prisma.category.upsert({
      where: { id: 'cat-accessoires' },
      update: {},
      create: { id: 'cat-accessoires', boutiqueId: boutique.id, name: 'Accessoires', icon: '👜' },
    }),
  ])

  console.log('✓ Catégories créées')

  // ── Produits ───────────────────────────────────────────────────────────────
  const products = [
    {
      id: 'prod-1',
      boutiqueId: boutique.id,
      categoryId: catVetements.id,
      name: 'Robe Wax Bleue',
      description: 'Robe en tissu wax authentique, disponible en plusieurs tailles.',
      price: 15000,
      costPrice: 8000,
      stock: 12,
      lowStockAt: 3,
      isFeatured: true,
      images: [],
    },
    {
      id: 'prod-2',
      boutiqueId: boutique.id,
      categoryId: catVetements.id,
      name: 'Boubou Homme Premium',
      description: 'Boubou brodé main, tissu bazin riche.',
      price: 35000,
      promoPrice: 28000,
      costPrice: 18000,
      stock: 5,
      lowStockAt: 2,
      images: [],
    },
    {
      id: 'prod-3',
      boutiqueId: boutique.id,
      categoryId: catAccessoires.id,
      name: 'Sac à main cuir',
      description: 'Sac en cuir véritable, fait main à Dakar.',
      price: 22000,
      costPrice: 12000,
      stock: 8,
      lowStockAt: 2,
      images: [],
    },
    {
      id: 'prod-4',
      boutiqueId: boutique.id,
      categoryId: catAccessoires.id,
      name: 'Collier traditionnel',
      description: 'Collier en perles colorées, artisanat local.',
      price: 5000,
      costPrice: 2000,
      stock: 3,
      lowStockAt: 3,
      images: [],
    },
  ]

  for (const p of products) {
    await prisma.product.upsert({
      where: { id: p.id },
      update: {},
      create: p as any,
    })
  }

  console.log(`✓ ${products.length} produits créés`)

  // ── Client de démo ─────────────────────────────────────────────────────────
  const customer = await prisma.customerProfile.upsert({
    where: { id: 'customer-demo' },
    update: {},
    create: {
      id: 'customer-demo',
      boutiqueId: boutique.id,
      name: 'Fatou Sow',
      phone: '+221 76 123 45 67',
      email: 'fatou@test.com',
      loyaltyPoints: 150,
      tags: ['VIP', 'Régulière'],
    },
  })

  console.log('✓ Client de démo créé')

  // ── Fournisseur de démo ────────────────────────────────────────────────────
  await prisma.supplier.upsert({
    where: { id: 'supplier-demo' },
    update: {},
    create: {
      id: 'supplier-demo',
      boutiqueId: boutique.id,
      name: 'Tissus Oumar & Fils',
      phone: '+221 77 987 65 43',
      email: 'oumar.tissus@gmail.com',
      address: 'Marché Sandaga, Dakar',
      notes: 'Fournisseur principal de tissus wax.',
    },
  })

  console.log('✓ Fournisseur de démo créé')

  // ── Commande de démo ───────────────────────────────────────────────────────
  const existing = await prisma.order.findUnique({ where: { number: 'VDX-2026-00001' } })
  if (!existing) {
    await prisma.order.create({
      data: {
        number: 'VDX-2026-00001',
        boutiqueId: boutique.id,
        customerId: customer.id,
        subtotal: 15000,
        total: 15000,
        status: 'PENDING',
        paymentStatus: 'UNPAID',
        notes: 'Commande de test',
        items: {
          create: {
            productId: 'prod-1',
            name: 'Robe Wax Bleue',
            price: 15000,
            quantity: 1,
            total: 15000,
          },
        },
        statusHistory: { create: { status: 'PENDING' } },
      },
    })
    console.log('✓ Commande de démo créée')
  }

  console.log('\n✅ Seed terminé !')
  console.log('──────────────────────────────────')
  console.log('  Email    : admin@vendix.com')
  console.log('  Password : admin123')
  console.log(`  Boutique : ${process.env.FRONTEND_URL || 'http://localhost:3005'}/boutique/demo-boutique`)
  console.log('──────────────────────────────────')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
