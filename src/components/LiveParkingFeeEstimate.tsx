import { useMemo } from 'react'
import { estimateActiveParkingFee } from '../logic/activeParkingEstimate.ts'
import { formatDuration, formatInr } from '../logic/parkingFees.ts'
import type { PricingOptions } from '../types/appSettings.ts'
import type { VehicleType } from '../types/vehicleSession.ts'

type LiveParkingFeeEstimateProps = {
  entryTimestamp: string
  vehicleType: VehicleType
  pricing: PricingOptions
  nowMs: number
  showDuration?: boolean
  showFee?: boolean
  feeSuffix?: string
}

export default function LiveParkingFeeEstimate({
  entryTimestamp,
  vehicleType,
  pricing,
  nowMs,
  showDuration = true,
  showFee = true,
  feeSuffix = ' (est.)',
}: LiveParkingFeeEstimateProps) {
  const estimate = useMemo(
    () => estimateActiveParkingFee(entryTimestamp, nowMs, vehicleType, pricing),
    [entryTimestamp, nowMs, vehicleType, pricing],
  )

  if (!estimate.ok) {
    return <>—</>
  }

  const parts: string[] = []
  if (showDuration) {
    parts.push(formatDuration(estimate.durationMs))
  }
  if (showFee) {
    parts.push(`${formatInr(estimate.feeInr)}${feeSuffix}`)
  }

  if (parts.length === 0) {
    return <>—</>
  }

  if (parts.length === 1) {
    return <>{parts[0]}</>
  }

  return <>{parts.join(' · ')}</>
}
