import type { CompletedParkingTransaction } from '../types/vehicleSession.ts'
import type { ParkingSession } from '../types/vehicleSession.ts'

export type ActivityEvent = {
  id: string
  kind: 'entry' | 'checkout'
  timestamp: string
  registrationNumber: string
  slotLabel: string
  feeInr?: number
}

export function buildActivityFeed(
  sessions: readonly ParkingSession[],
  completed: readonly CompletedParkingTransaction[],
  slotLabelById: ReadonlyMap<string, string>,
): ActivityEvent[] {
  const events: ActivityEvent[] = []

  for (const session of sessions) {
    events.push({
      id: `entry-${session.id}`,
      kind: 'entry',
      timestamp: session.entryTimestamp,
      registrationNumber: session.registrationNumber,
      slotLabel: slotLabelById.get(session.slotId) ?? session.slotId,
    })
  }

  for (const txn of completed) {
    events.push({
      id: txn.id,
      kind: 'checkout',
      timestamp: txn.checkoutTimestamp,
      registrationNumber: txn.registrationNumber,
      slotLabel: slotLabelById.get(txn.slotId) ?? txn.slotId,
      feeInr: txn.feeInr,
    })
  }

  return events.sort(
    (a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  )
}
