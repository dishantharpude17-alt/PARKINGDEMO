import type {
  CompletedParkingTransaction,
  ParkingSession,
  VehicleType,
} from '../types/vehicleSession.ts'

export type ParkingHistoryStatus = 'completed' | 'active'

export type ParkingHistoryRow = {
  id: string
  registrationNumber: string
  slotId: string
  slotLabel: string
  entryTimestamp: string
  checkoutTimestamp: string | null
  durationMs: number | null
  feeInr: number | null
  vehicleType: VehicleType
  paymentMethod: string | null
  status: ParkingHistoryStatus
  sortTimestamp: string
}

export type HistoryDateFilter = {
  fromDate: string
  toDate: string
}

export function localDateKeyFromIso(isoTimestamp: string): string {
  const date = new Date(isoTimestamp)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function validateHistoryDateRange(
  fromDate: string,
  toDate: string,
): string | null {
  if (fromDate && toDate && fromDate > toDate) {
    return 'From Date cannot be later than To Date.'
  }
  return null
}

function matchesRegistrationFilter(
  registrationNumber: string,
  searchQuery: string,
): boolean {
  const normalizedSearch = searchQuery.trim().toLowerCase()
  if (!normalizedSearch) {
    return true
  }
  return registrationNumber.toLowerCase().includes(normalizedSearch)
}

function matchesDateRange(
  localDateKey: string,
  fromDate: string,
  toDate: string,
): boolean {
  if (fromDate && localDateKey < fromDate) {
    return false
  }
  if (toDate && localDateKey > toDate) {
    return false
  }
  return true
}

export function buildParkingHistoryRows(
  sessions: readonly ParkingSession[],
  completed: readonly CompletedParkingTransaction[],
  getSlotLabel: (slotId: string) => string,
): ParkingHistoryRow[] {
  const rows: ParkingHistoryRow[] = []

  for (const session of sessions) {
    rows.push({
      id: `active-${session.id}`,
      registrationNumber: session.registrationNumber,
      slotId: session.slotId,
      slotLabel: getSlotLabel(session.slotId),
      entryTimestamp: session.entryTimestamp,
      checkoutTimestamp: null,
      durationMs: null,
      feeInr: null,
      vehicleType: session.vehicleType,
      paymentMethod: null,
      status: 'active',
      sortTimestamp: session.entryTimestamp,
    })
  }

  for (const txn of completed) {
    rows.push({
      id: txn.id,
      registrationNumber: txn.registrationNumber,
      slotId: txn.slotId,
      slotLabel: getSlotLabel(txn.slotId),
      entryTimestamp: txn.entryTimestamp,
      checkoutTimestamp: txn.checkoutTimestamp,
      durationMs: txn.durationMs,
      feeInr: txn.feeInr,
      vehicleType: txn.vehicleType,
      paymentMethod: txn.paymentMethod ?? null,
      status: 'completed',
      sortTimestamp: txn.checkoutTimestamp,
    })
  }

  return rows.sort(
    (a, b) =>
      new Date(b.sortTimestamp).getTime() - new Date(a.sortTimestamp).getTime(),
  )
}

export function filterParkingHistoryRows(
  rows: readonly ParkingHistoryRow[],
  searchQuery: string,
  dateFilter: HistoryDateFilter,
): ParkingHistoryRow[] {
  return rows.filter((row) => {
    if (!matchesRegistrationFilter(row.registrationNumber, searchQuery)) {
      return false
    }

    const rangeDateKey =
      row.status === 'completed' && row.checkoutTimestamp
        ? localDateKeyFromIso(row.checkoutTimestamp)
        : localDateKeyFromIso(row.entryTimestamp)

    return matchesDateRange(
      rangeDateKey,
      dateFilter.fromDate,
      dateFilter.toDate,
    )
  })
}

export function filterCompletedTransactions(
  completed: readonly CompletedParkingTransaction[],
  searchQuery: string,
  dateFilter: HistoryDateFilter,
): CompletedParkingTransaction[] {
  return completed.filter((txn) => {
    if (
      !matchesDateRange(
        localDateKeyFromIso(txn.checkoutTimestamp),
        dateFilter.fromDate,
        dateFilter.toDate,
      )
    ) {
      return false
    }
    return matchesRegistrationFilter(txn.registrationNumber, searchQuery)
  })
}
