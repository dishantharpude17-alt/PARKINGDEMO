import type { ParkingSlot } from '../types/parkingSlot.ts'

/** Configurable demo lot size (rows of 4: A1–D4 when set to 16). */
export const DEMO_PARKING_SLOT_COUNT = 16

const SLOTS_PER_ROW = 4

export function createDemoParkingSlots(
  count: number = DEMO_PARKING_SLOT_COUNT,
): ParkingSlot[] {
  return Array.from({ length: count }, (_, index) => {
    const rowLetter = String.fromCharCode(
      65 + Math.floor(index / SLOTS_PER_ROW),
    )
    const column = (index % SLOTS_PER_ROW) + 1
    const label = `${rowLetter}${column}`

    return {
      id: `slot-${label.toLowerCase()}`,
      label,
      status: 'available',
    }
  })
}
