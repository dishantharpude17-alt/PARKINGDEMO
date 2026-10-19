import type { CompletedParkingTransaction } from '../types/vehicleSession.ts'

export function escapeCsvField(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function csvRow(fields: string[]): string {
  return `${fields.map(escapeCsvField).join(',')}\r\n`
}

export function buildCompletedTransactionsCsv(
  transactions: readonly CompletedParkingTransaction[],
  getSlotLabel: (slotId: string) => string,
  formatTimestamp: (iso: string) => string,
  formatDurationLabel: (durationMs: number) => string,
  formatFee: (feeInr: number) => string,
): string {
  let csv = csvRow([
    'Registration',
    'Slot',
    'Entry',
    'Checkout',
    'Duration',
    'Fee (INR)',
    'Payment method',
    'Payment status',
    'Standard fee (INR)',
    'Discount (INR)',
  ])

  for (const txn of transactions) {
    csv += csvRow([
      txn.registrationNumber,
      getSlotLabel(txn.slotId),
      formatTimestamp(txn.entryTimestamp),
      formatTimestamp(txn.checkoutTimestamp),
      formatDurationLabel(txn.durationMs),
      formatFee(txn.feeInr),
      txn.paymentMethod ?? '',
      txn.paymentStatus ?? '',
      txn.standardFeeInr !== undefined ? String(txn.standardFeeInr) : '',
      txn.discountInr !== undefined ? String(txn.discountInr) : '',
    ])
  }

  return csv
}

export function downloadCsvFile(filename: string, csvContent: string): void {
  try {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    anchor.style.display = 'none'
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
  } catch {
    // Download may fail in restricted environments.
  }
}

export function historyExportFilename(reference: Date = new Date()): string {
  const year = reference.getFullYear()
  const month = String(reference.getMonth() + 1).padStart(2, '0')
  const day = String(reference.getDate()).padStart(2, '0')
  return `parking-history-${year}-${month}-${day}.csv`
}
