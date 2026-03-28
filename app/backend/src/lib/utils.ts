import { prisma } from './prisma'

export async function generateOrderNumber(): Promise<string> {
  const year = new Date().getFullYear()
  const count = await prisma.order.count()
  const padded = String(count + 1).padStart(5, '0')
  return `VDX-${year}-${padded}`
}

export async function generateReceiptNumber(): Promise<string> {
  const year = new Date().getFullYear()
  const count = await prisma.receipt.count()
  const padded = String(count + 1).padStart(5, '0')
  return `REC-${year}-${padded}`
}

export async function generatePurchaseOrderNumber(): Promise<string> {
  const year = new Date().getFullYear()
  const count = await prisma.purchaseOrder.count()
  const padded = String(count + 1).padStart(5, '0')
  return `PO-${year}-${padded}`
}
