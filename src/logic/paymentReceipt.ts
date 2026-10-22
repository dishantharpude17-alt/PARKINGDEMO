import type { CompletedParkingTransaction } from '../types/vehicleSession.ts'

export function createReceiptNumber(
  sessionId: string,
  paymentAt: Date,
): string {
  const ymd = paymentAt.toISOString().slice(0, 10).replace(/-/g, '')
  const suffix = sessionId.replace(/[^a-z0-9]/gi, '').slice(-6).toUpperCase()
  return `RCP-${ymd}-${suffix || '000000'}`
}

export function resolveReceiptNumber(
  transaction: CompletedParkingTransaction,
): string {
  return transaction.receiptNumber?.trim() || transaction.id
}

export function resolvePaymentTimestampIso(
  transaction: CompletedParkingTransaction,
): string | null {
  if (transaction.paymentTimestamp) {
    return transaction.paymentTimestamp
  }
  if (transaction.paymentStatus === 'paid' || transaction.paymentMethod) {
    return transaction.checkoutTimestamp
  }
  return null
}

export function canViewPaymentReceipt(
  transaction: CompletedParkingTransaction,
): boolean {
  return transaction.paymentStatus === 'paid' || Boolean(transaction.paymentMethod)
}
