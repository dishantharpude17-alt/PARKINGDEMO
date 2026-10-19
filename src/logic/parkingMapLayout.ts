import type { ParkingSlot } from '../types/parkingSlot.ts'

export type ParkingMapRow = {
  rowLabel: string
  slots: ParkingSlot[]
}

/** Groups slots into labeled rows from each slot's display label (e.g. A1 → row A). */
export function groupSlotsForParkingMap(
  slots: readonly ParkingSlot[],
): ParkingMapRow[] {
  const rowMap = new Map<string, ParkingSlot[]>()

  for (const slot of slots) {
    const match = slot.label.match(/^([A-Za-z]+)/)
    const rowLabel = match?.[1]?.toUpperCase() ?? 'Slots'
    const row = rowMap.get(rowLabel)
    if (row) {
      row.push(slot)
    } else {
      rowMap.set(rowLabel, [slot])
    }
  }

  return [...rowMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([rowLabel, rowSlots]) => ({
      rowLabel,
      slots: [...rowSlots].sort((a, b) =>
        a.label.localeCompare(b.label, undefined, { numeric: true }),
      ),
    }))
}
