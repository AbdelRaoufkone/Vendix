import PDFDocument from 'pdfkit'
import { prisma } from '../lib/prisma'
import { AppError } from '../middleware/error.middleware'

export async function generateReceiptPDF(orderId: string): Promise<Buffer> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      boutique: {
        select: { name: true, logo: true, phone: true, address: true, city: true },
      },
      customer: {
        select: { name: true, phone: true, email: true },
      },
      items: true,
      payments: {
        orderBy: { createdAt: 'desc' },
      },
      receipt: {
        select: { number: true },
      },
    },
  })

  if (!order) throw new AppError('Commande introuvable', 404)

  const receiptNumber = order.receipt?.number ?? `REC-${new Date().getFullYear()}-00000`

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' })
    const chunks: Buffer[] = []

    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const primaryColor = '#6366f1'
    const grayLight = '#f3f4f6'
    const grayText = '#6b7280'
    const black = '#111827'

    // ── EN-TÊTE ──────────────────────────────────────────────────────────────

    // Logo (base64 data URL)
    if (order.boutique.logo?.startsWith('data:image')) {
      try {
        const matches = order.boutique.logo.match(/^data:image\/(\w+);base64,(.+)$/)
        if (matches) {
          const imgBuffer = Buffer.from(matches[2], 'base64')
          doc.image(imgBuffer, 50, 45, { width: 60, height: 60 })
        }
      } catch {
        // Ignorer si l'image est invalide
      }
    }

    // Nom de la boutique
    doc
      .font('Helvetica-Bold')
      .fontSize(22)
      .fillColor(primaryColor)
      .text(order.boutique.name, 120, 50)

    // Coordonnées boutique
    const boutiqueInfo = [
      order.boutique.address,
      order.boutique.city,
      order.boutique.phone,
    ]
      .filter(Boolean)
      .join(' • ')

    if (boutiqueInfo) {
      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor(grayText)
        .text(boutiqueInfo, 120, 76)
    }

    // Date et numéro de reçu (en haut à droite)
    const dateStr = new Date(order.createdAt).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })

    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(grayText)
      .text(`Date : ${dateStr}`, 350, 50, { align: 'right', width: 195 })

    doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .fillColor(black)
      .text(`Reçu N° ${receiptNumber}`, 350, 65, { align: 'right', width: 195 })

    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(grayText)
      .text(`Commande : ${order.number}`, 350, 80, { align: 'right', width: 195 })

    // Ligne séparatrice principale
    doc.moveTo(50, 120).lineTo(545, 120).lineWidth(2).strokeColor(primaryColor).stroke()

    // ── INFOS CLIENT ─────────────────────────────────────────────────────────

    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor(black)
      .text('FACTURÉ À', 50, 135)

    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor(black)
      .text(order.customer.name, 50, 150)

    const customerInfo = [order.customer.phone, order.customer.email].filter(Boolean).join(' • ')
    if (customerInfo) {
      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor(grayText)
        .text(customerInfo, 50, 163)
    }

    if (order.deliveryAddress) {
      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor(grayText)
        .text(`Livraison : ${order.deliveryAddress}`, 50, 176)
    }

    // ── TABLEAU DES ARTICLES ─────────────────────────────────────────────────

    const tableTop = 210
    const colX = { item: 50, qty: 310, unit: 370, total: 460 }

    // En-tête du tableau
    doc
      .rect(50, tableTop - 6, 495, 22)
      .fillColor(primaryColor)
      .fill()

    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor('#ffffff')
      .text('ARTICLE', colX.item, tableTop, { width: 250 })
      .text('QTÉ', colX.qty, tableTop, { width: 55, align: 'center' })
      .text('PRIX UNIT.', colX.unit, tableTop, { width: 80, align: 'right' })
      .text('TOTAL', colX.total, tableTop, { width: 85, align: 'right' })

    // Lignes articles
    let y = tableTop + 26
    let isAlternate = false

    for (const item of order.items) {
      const rowHeight = 20

      if (isAlternate) {
        doc.rect(50, y - 4, 495, rowHeight).fillColor(grayLight).fill()
      }

      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor(black)
        .text(item.name, colX.item, y, { width: 250 })
        .text(String(item.quantity), colX.qty, y, { width: 55, align: 'center' })
        .text(formatAmount(Number(item.price)), colX.unit, y, { width: 80, align: 'right' })
        .text(formatAmount(Number(item.total)), colX.total, y, { width: 85, align: 'right' })

      y += rowHeight
      isAlternate = !isAlternate
    }

    // ── TOTAUX ───────────────────────────────────────────────────────────────

    y += 10
    doc.moveTo(50, y).lineTo(545, y).lineWidth(0.5).strokeColor('#d1d5db').stroke()
    y += 12

    const totalColLeft = 350
    const totalColRight = 545

    // Sous-total HT
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(grayText)
      .text('Sous-total HT', totalColLeft, y, { width: 110 })
      .text(formatAmount(Number(order.subtotal)), totalColLeft + 110, y, {
        width: totalColRight - totalColLeft - 110,
        align: 'right',
      })
    y += 16

    // Frais de livraison
    const deliveryFee = Number(order.deliveryFee)
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(grayText)
      .text('Frais de livraison', totalColLeft, y, { width: 110 })
      .text(deliveryFee > 0 ? formatAmount(deliveryFee) : 'Gratuit', totalColLeft + 110, y, {
        width: totalColRight - totalColLeft - 110,
        align: 'right',
      })
    y += 16

    // Remise éventuelle
    const discount = Number(order.discount)
    if (discount > 0) {
      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor('#ef4444')
        .text('Remise', totalColLeft, y, { width: 110 })
        .text(`- ${formatAmount(discount)}`, totalColLeft + 110, y, {
          width: totalColRight - totalColLeft - 110,
          align: 'right',
        })
      y += 16
    }

    // Ligne avant total TTC
    doc.moveTo(totalColLeft, y).lineTo(totalColRight, y).lineWidth(0.5).strokeColor('#d1d5db').stroke()
    y += 8

    // Total TTC
    doc
      .rect(totalColLeft, y - 4, totalColRight - totalColLeft, 24)
      .fillColor(primaryColor)
      .fill()

    doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .fillColor('#ffffff')
      .text('TOTAL TTC', totalColLeft + 5, y + 2, { width: 110 })
      .text(formatAmount(Number(order.total)), totalColLeft + 110, y + 2, {
        width: totalColRight - totalColLeft - 115,
        align: 'right',
      })

    y += 32

    // ── MODE DE PAIEMENT ─────────────────────────────────────────────────────

    if (order.payments.length > 0) {
      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor(black)
        .text('MODE DE PAIEMENT', 50, y)

      y += 14

      for (const payment of order.payments) {
        const methodLabel = paymentMethodLabel(String(payment.method))
        const refText = payment.reference ? ` (réf. ${payment.reference})` : ''
        doc
          .font('Helvetica')
          .fontSize(9)
          .fillColor(grayText)
          .text(`${methodLabel}${refText} : ${formatAmount(Number(payment.amount))}`, 50, y)
        y += 14
      }

      const paidTotal = order.payments.reduce((s, p) => s + Number(p.amount), 0)
      const remaining = Number(order.total) - paidTotal

      if (remaining > 0.01) {
        doc
          .font('Helvetica')
          .fontSize(9)
          .fillColor('#ef4444')
          .text(`Reste à payer : ${formatAmount(remaining)}`, 50, y)
        y += 14
      }
    }

    // ── NOTES ────────────────────────────────────────────────────────────────

    if (order.notes) {
      y += 6
      doc
        .font('Helvetica-BoldOblique')
        .fontSize(9)
        .fillColor(grayText)
        .text(`Note : ${order.notes}`, 50, y, { width: 495 })
    }

    // ── PIED DE PAGE ─────────────────────────────────────────────────────────

    const footerY = 760
    doc.moveTo(50, footerY).lineTo(545, footerY).lineWidth(1).strokeColor(primaryColor).stroke()

    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(grayText)
      .text('Merci pour votre commande — VENDIX', 50, footerY + 8, {
        align: 'center',
        width: 495,
      })

    doc.end()
  })
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount) + ' XOF'
}

function paymentMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    CASH: 'Espèces',
    WAVE: 'Wave',
    ORANGE_MONEY: 'Orange Money',
    MTN_MOMO: 'MTN MoMo',
    BANK_TRANSFER: 'Virement bancaire',
    CARD: 'Carte bancaire',
    OTHER: 'Autre',
  }
  return labels[method] ?? method
}
