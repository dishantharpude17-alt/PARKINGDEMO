import type { SlotCounts } from '../types/parkingSlot.ts'

export type OccupancyAlert = {
  id: string
  severity: 'warning' | 'critical'
  message: string
}

export type OccupancyAlertOptions = {
  enabled: boolean
  thresholdPercent: number
}

export function getOccupancyAlerts(
  slotCounts: SlotCounts,
  occupancyPercent: number,
  options: OccupancyAlertOptions = {
    enabled: true,
    thresholdPercent: 80,
  },
): OccupancyAlert[] {
  if (!options.enabled || slotCounts.total === 0) {
    return []
  }

  const threshold = Math.min(100, Math.max(1, options.thresholdPercent))
  const alerts: OccupancyAlert[] = []

  if (slotCounts.available === 0) {
    alerts.push({
      id: 'lot-full',
      severity: 'critical',
      message:
        'Parking lot is full — no available slots. New entries will be rejected until a vehicle checks out.',
    })
  }

  if (occupancyPercent >= threshold && slotCounts.available > 0) {
    alerts.push({
      id: 'high-occupancy',
      severity: 'warning',
      message: `High occupancy: ${occupancyPercent}% of slots are in use (threshold ${threshold}%).`,
    })
  }

  return alerts
}
