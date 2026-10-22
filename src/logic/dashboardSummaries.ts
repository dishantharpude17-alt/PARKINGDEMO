import type { ActivityEvent } from './activityFeed.ts'
import {
  VEHICLE_TYPES,
  type VehicleType,
} from '../types/vehicleSession.ts'

export function countActiveSessionsByVehicleType(
  sessions: readonly { vehicleType: VehicleType }[],
): Record<VehicleType, number> {
  const counts = Object.fromEntries(
    VEHICLE_TYPES.map((type) => [type, 0]),
  ) as Record<VehicleType, number>
  for (const session of sessions) {
    counts[session.vehicleType] += 1
  }
  return counts
}

export function countRecentActivityByKind(
  events: readonly ActivityEvent[],
  limit: number = 20,
): { entry: number; checkout: number } {
  const recent = [...events]
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )
    .slice(0, limit)

  let entry = 0
  let checkout = 0
  for (const event of recent) {
    if (event.kind === 'entry') {
      entry += 1
    } else {
      checkout += 1
    }
  }
  return { entry, checkout }
}

export function barScaleMax(value: number): number {
  return Math.max(1, value)
}
