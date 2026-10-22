import {
  DEMO_BAYS_PER_ROW,
  bayTypeForDemoLabel,
} from '../data/demoParkingSlots.ts'
import type { ParkingSlot } from '../types/parkingSlot.ts'

export type ParkingMapRow = {
  rowLabel: string
  slots: ParkingSlot[]
}

export type FloorPlanZoneLayout = {
  zoneId: 'A' | 'B'
  title: string
  rows: ParkingMapRow[]
}

export type FloorPlanLayout = {
  zoneTwoWheeler: FloorPlanZoneLayout
  zoneFourWheeler: FloorPlanZoneLayout
}

function sortSlotsByLabel(slots: readonly ParkingSlot[]): ParkingSlot[] {
  return [...slots].sort((a, b) =>
    a.label.localeCompare(b.label, undefined, { numeric: true }),
  )
}

function rowLabelForChunk(firstLabel: string, lastLabel: string): string {
  return `${firstLabel}–${lastLabel}`
}

function chunkIntoRows(
  slots: readonly ParkingSlot[],
  baysPerRow: number,
): ParkingMapRow[] {
  const sorted = sortSlotsByLabel(slots)
  const rows: ParkingMapRow[] = []

  for (let index = 0; index < sorted.length; index += baysPerRow) {
    const chunk = sorted.slice(index, index + baysPerRow)
    if (chunk.length === 0) {
      continue
    }
    const first = chunk[0]!.label
    const last = chunk[chunk.length - 1]!.label
    rows.push({
      rowLabel: rowLabelForChunk(first, last),
      slots: chunk,
    })
  }

  return rows
}

/** Top-down floor plan: Zone A (2W) and Zone B (4W) rows of ten bays. */
export function buildFloorPlanLayout(
  slots: readonly ParkingSlot[],
): FloorPlanLayout {
  const twoWheeler = slots.filter(
    (slot) =>
      slot.bayType === 'two_wheeler' ||
      bayTypeForDemoLabel(slot.label) === 'two_wheeler',
  )
  const fourWheeler = slots.filter(
    (slot) =>
      slot.bayType === 'four_wheeler' ||
      bayTypeForDemoLabel(slot.label) === 'four_wheeler',
  )

  return {
    zoneTwoWheeler: {
      zoneId: 'A',
      title: 'Zone A — Dedicated two-wheeler (A01–A60)',
      rows: chunkIntoRows(twoWheeler, DEMO_BAYS_PER_ROW),
    },
    zoneFourWheeler: {
      zoneId: 'B',
      title: 'Zone B — Four-wheeler bays (B01–B40)',
      rows: chunkIntoRows(fourWheeler, DEMO_BAYS_PER_ROW),
    },
  }
}

/** Flat row list (10 zones) for compact dashboard summaries. */
export function groupSlotsForParkingMap(
  slots: readonly ParkingSlot[],
): ParkingMapRow[] {
  const layout = buildFloorPlanLayout(slots)
  return layout.zoneTwoWheeler.rows.concat(layout.zoneFourWheeler.rows)
}
