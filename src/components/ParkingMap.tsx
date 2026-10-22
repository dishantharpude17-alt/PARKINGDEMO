import { useEffect, useMemo } from 'react'
import LiveParkingFeeEstimate from './LiveParkingFeeEstimate.tsx'
import { buildFloorPlanLayout } from '../logic/parkingMapLayout.ts'
import {
  calculateParkingDurationMs,
  formatDuration,
} from '../logic/parkingFees.ts'
import {
  MAX_MOTORCYCLES_PER_FOUR_WHEELER_BAY,
  canAssignVehicleToSlot,
  slotBayTypeLabel,
} from '../logic/slotAllocation.ts'
import {
  DEMO_FOUR_WHEELER_BAY_COUNT,
  DEMO_PARKING_SLOT_COUNT,
  DEMO_TWO_WHEELER_BAY_COUNT,
} from '../data/demoParkingSlots.ts'
import type { PricingOptions } from '../types/appSettings.ts'
import type { ParkingSlot } from '../types/parkingSlot.ts'
import type { ParkingSession, VehicleType } from '../types/vehicleSession.ts'
import VehicleTopDownIcon from './VehicleTopDownIcon.tsx'

export function parkingMapBayElementId(slotId: string): string {
  return `parking-map-bay-${slotId}`
}

type ParkingMapProps = {
  slots: readonly ParkingSlot[]
  selectedSlotId: string | null
  onSelectSlot: (slotId: string) => void
  sessionsBySlotId: ReadonlyMap<string, readonly ParkingSession[]>
  formatEntryTime: (iso: string) => string
  pricing: PricingOptions
  liveNowMs: number
  onRequestCheckout?: (session: ParkingSession) => void
  checkoutProcessing?: boolean
  layoutMode?: 'default' | 'entry'
  entryVehicleType?: VehicleType
}

type BayTileProps = {
  slot: ParkingSlot
  isSelected: boolean
  slotSessions: readonly ParkingSession[]
  onSelect: () => void
  entryPickerVehicleType?: VehicleType
}

/** Display-only split for rectangular 2W bays (AA00AA + 0000). */
function twoWheelerBayRegistrationLines(registrationNumber: string): {
  line1: string
  line2: string | null
} {
  if (registrationNumber.length === 10) {
    return {
      line1: registrationNumber.slice(0, 6),
      line2: registrationNumber.slice(6),
    }
  }
  return { line1: registrationNumber, line2: null }
}

function BayTile({
  slot,
  isSelected,
  slotSessions,
  onSelect,
  entryPickerVehicleType,
}: BayTileProps) {
  const isTwoWheeler = slot.bayType === 'two_wheeler'
  const primarySession = slotSessions[0]
  const isAvailable = slot.status === 'available'
  const statusLabel = isAvailable ? 'Available' : 'Occupied'
  const displayStatus = isSelected ? 'Selected' : statusLabel
  const motorcycleOverflow =
    slot.bayType === 'four_wheeler' &&
    slotSessions.length > 0 &&
    slotSessions.every((s) => s.vehicleType === 'motorcycle')
  const isDualBikeBay = motorcycleOverflow && slotSessions.length >= 2
  const capacityHint =
    motorcycleOverflow && !isAvailable
      ? `${slotSessions.length}/${MAX_MOTORCYCLES_PER_FOUR_WHEELER_BAY}`
      : null
  const ariaRegs = slotSessions.map((s) => s.registrationNumber).join(', ')
  const floorVehicleIconClass =
    'parking-bay-vehicle-art parking-bay-vehicle-art--micro'

  const entryAssignable =
    entryPickerVehicleType === undefined
      ? true
      : canAssignVehicleToSlot(slot, slotSessions, entryPickerVehicleType)
  const isIncompatible = entryPickerVehicleType !== undefined && !entryAssignable

  return (
    <li>
      <button
        type="button"
        id={parkingMapBayElementId(slot.id)}
        className={`parking-map-bay parking-map-bay--${slot.status}${isTwoWheeler ? ' parking-map-bay--two-wheeler' : ' parking-map-bay--four-wheeler'}${isDualBikeBay ? ' parking-map-bay--shared-bikes' : ''}${isSelected ? ' is-selected' : ''}${isIncompatible ? ' parking-map-bay--incompatible' : ''}`}
        aria-pressed={isSelected}
        aria-disabled={isIncompatible}
        disabled={isIncompatible}
        aria-label={`Slot ${slot.label}, ${slotBayTypeLabel(slot.bayType)}, ${isIncompatible ? 'Incompatible' : displayStatus}${ariaRegs ? `, ${ariaRegs}` : ''}${capacityHint ? `, ${capacityHint} bikes` : ''}`}
        onClick={() => {
          if (!isIncompatible) {
            onSelect()
          }
        }}
      >
        <span
          className={`parking-status-dot parking-status-dot--${isSelected ? 'selected' : isAvailable ? 'available' : 'occupied'}`}
        />
        <span className="parking-map-bay-label">{slot.label}</span>
        {!isAvailable ? (
          isTwoWheeler && !isDualBikeBay ? (
            <span className="parking-map-bay-tile-stack parking-map-bay-tile-stack--two-wheeler">
              <VehicleTopDownIcon
                type="motorcycle"
                className={floorVehicleIconClass}
              />
              <span className="parking-map-bay-tile-regs parking-map-bay-tile-regs--two-wheeler">
                {slotSessions.map((session) => {
                  const { line1, line2 } = twoWheelerBayRegistrationLines(
                    session.registrationNumber,
                  )
                  return (
                    <span
                      key={session.id}
                      className="parking-map-bay-reg parking-map-bay-reg--tile parking-map-bay-reg--two-wheeler"
                      title={session.registrationNumber}
                    >
                      <span className="parking-map-bay-reg-line">{line1}</span>
                      {line2 ? (
                        <span className="parking-map-bay-reg-line">{line2}</span>
                      ) : null}
                    </span>
                  )
                })}
              </span>
            </span>
          ) : (
            <>
              <span
                className={`parking-map-bay-tile-vehicles${isDualBikeBay ? ' parking-map-bay-tile-vehicles--dual' : ''}`}
              >
                {isDualBikeBay ? (
                  slotSessions.map((session) => (
                    <span
                      key={session.id}
                      className="parking-map-bay-dual-unit"
                    >
                      <VehicleTopDownIcon
                        type="motorcycle"
                        className="parking-bay-vehicle-art parking-bay-vehicle-art--dual-moto"
                      />
                      <span
                        className="parking-map-bay-reg parking-map-bay-reg--tile parking-map-bay-reg--dual"
                        title={session.registrationNumber}
                      >
                        {session.registrationNumber}
                      </span>
                    </span>
                  ))
                ) : (
                  <VehicleTopDownIcon
                    type={primarySession?.vehicleType ?? 'car'}
                    className={floorVehicleIconClass}
                  />
                )}
              </span>
              {!isDualBikeBay ? (
                <span className="parking-map-bay-tile-regs">
                  {slotSessions.map((session) => (
                    <span
                      key={session.id}
                      className="parking-map-bay-reg parking-map-bay-reg--tile"
                      title={session.registrationNumber}
                    >
                      {session.registrationNumber}
                    </span>
                  ))}
                </span>
              ) : null}
            </>
          )
        ) : (
          <span className="parking-map-bay-tile-open">Open</span>
        )}
        {capacityHint ? (
          <span className="parking-map-bay-capacity">{capacityHint}</span>
        ) : null}
      </button>
    </li>
  )
}

function FloorPlanRow({
  rowLabel,
  slots,
  selectedSlotId,
  sessionsBySlotId,
  onSelectSlot,
  zone,
  entryPickerVehicleType,
}: {
  rowLabel: string
  slots: readonly ParkingSlot[]
  selectedSlotId: string | null
  sessionsBySlotId: ReadonlyMap<string, readonly ParkingSession[]>
  onSelectSlot: (slotId: string) => void
  zone: 'two_wheeler' | 'four_wheeler'
  entryPickerVehicleType?: VehicleType
}) {
  return (
    <div className="parking-floor-plan-row">
      <span className="parking-floor-plan-row-label">{rowLabel}</span>
      <ul
        className={`parking-map-bays parking-map-bays--floor-row${zone === 'two_wheeler' ? ' parking-map-bays--two-wheeler-zone' : ' parking-map-bays--four-wheeler-zone'}`}
      >
        {slots.map((slot) => (
          <BayTile
            key={slot.id}
            slot={slot}
            isSelected={slot.id === selectedSlotId}
            slotSessions={sessionsBySlotId.get(slot.id) ?? []}
            onSelect={() => onSelectSlot(slot.id)}
            entryPickerVehicleType={entryPickerVehicleType}
          />
        ))}
      </ul>
    </div>
  )
}

export default function ParkingMap({
  slots,
  selectedSlotId,
  onSelectSlot,
  sessionsBySlotId,
  formatEntryTime,
  pricing,
  liveNowMs,
  onRequestCheckout,
  checkoutProcessing = false,
  layoutMode = 'default',
  entryVehicleType,
}: ParkingMapProps) {
  const isEntryLayout = layoutMode === 'entry'
  const entryPickerVehicleType = isEntryLayout ? entryVehicleType : undefined
  const showTwoWheelerZone =
    !isEntryLayout || entryVehicleType === 'motorcycle'
  const showFourWheelerZone =
    !isEntryLayout ||
    entryVehicleType === 'motorcycle' ||
    entryVehicleType === 'car' ||
    entryVehicleType === 'van' ||
    entryVehicleType === 'truck'

  const floorPlan = useMemo(() => buildFloorPlanLayout(slots), [slots])

  const slotCounts = useMemo(() => {
    let available = 0
    let occupied = 0
    let twoWheelerAvailable = 0
    let twoWheelerOccupied = 0
    let fourWheelerAvailable = 0
    let fourWheelerOccupied = 0

    for (const slot of slots) {
      if (slot.status === 'available') {
        available += 1
        if (slot.bayType === 'two_wheeler') {
          twoWheelerAvailable += 1
        } else {
          fourWheelerAvailable += 1
        }
      } else {
        occupied += 1
        if (slot.bayType === 'two_wheeler') {
          twoWheelerOccupied += 1
        } else {
          fourWheelerOccupied += 1
        }
      }
    }

    return {
      available,
      occupied,
      total: slots.length,
      twoWheelerAvailable,
      twoWheelerOccupied,
      fourWheelerAvailable,
      fourWheelerOccupied,
    }
  }, [slots])

  const selectedSlot =
    selectedSlotId !== null
      ? slots.find((slot) => slot.id === selectedSlotId) ?? null
      : null
  const selectedSlotSessions = selectedSlot
    ? (sessionsBySlotId.get(selectedSlot.id) ?? [])
    : []

  const asOfIso = new Date(liveNowMs).toISOString()

  useEffect(() => {
    if (!selectedSlotId) {
      return
    }
    const targetId = parkingMapBayElementId(selectedSlotId)
    const scrollToBay = () => {
      const element = document.getElementById(targetId)
      if (!element) {
        return false
      }
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center',
      })
      return true
    }
    if (!scrollToBay()) {
      const retry = window.setTimeout(scrollToBay, 120)
      return () => window.clearTimeout(retry)
    }
    return undefined
  }, [selectedSlotId, slots])

  return (
    <div
      className={`parking-map parking-map--floor-one${isEntryLayout ? ' parking-map--entry-embed' : ''}`}
    >
      <div className="parking-map-floor-wrap">
        <div
          className="parking-map-canvas parking-floor-plan parking-floor-perimeter"
          role="group"
          aria-label={
            isEntryLayout
              ? 'Choose a compatible parking bay for vehicle entry'
              : 'Floor 1 parking plan — Zone A two-wheeler and Zone B four-wheeler'
          }
        >
          <header className="parking-floor-header">
            <div>
              <h3 className="parking-floor-title">
                {isEntryLayout ? 'Choose parking bay' : 'Floor 1 — Live plan'}
              </h3>
              <p className="parking-floor-subtitle">
                {isEntryLayout
                  ? entryVehicleType === 'motorcycle'
                    ? 'Zone A (A01–A60) and overflow four-wheeler bays when eligible'
                    : 'Zone B (B01–B40) four-wheeler bays'
                  : 'Zone A (A01–A60) · Zone B (B01–B40)'}
              </p>
            </div>
            <ul className="parking-floor-header-legend" aria-label="Status key">
              <li>
                <span className="parking-status-dot parking-status-dot--available" />
                Available
              </li>
              <li>
                <span className="parking-status-dot parking-status-dot--occupied" />
                Occupied
              </li>
              <li>
                <span className="parking-status-dot parking-status-dot--selected" />
                Selected
              </li>
              {isEntryLayout ? (
                <li>
                  <span className="parking-status-dot parking-status-dot--incompatible" />
                  Incompatible
                </li>
              ) : null}
            </ul>
          </header>

          {!isEntryLayout ? (
          <>
          <div className="parking-floor-capacity-cards" aria-label="Lot capacity">
            <div className="parking-capacity-card">
              <span className="parking-capacity-card-label">Total capacity</span>
              <strong>{DEMO_PARKING_SLOT_COUNT}</strong>
              <span className="parking-capacity-card-meta">
                {slotCounts.available} open · {slotCounts.occupied} occupied
              </span>
            </div>
            <div className="parking-capacity-card parking-capacity-card--2w">
              <span className="parking-capacity-card-label">Dedicated 2W</span>
              <strong>{DEMO_TWO_WHEELER_BAY_COUNT}</strong>
              <span className="parking-capacity-card-meta">
                {slotCounts.twoWheelerAvailable} open ·{' '}
                {slotCounts.twoWheelerOccupied} occupied
              </span>
            </div>
            <div className="parking-capacity-card parking-capacity-card--4w">
              <span className="parking-capacity-card-label">Four-wheeler</span>
              <strong>{DEMO_FOUR_WHEELER_BAY_COUNT}</strong>
              <span className="parking-capacity-card-meta">
                {slotCounts.fourWheelerAvailable} open ·{' '}
                {slotCounts.fourWheelerOccupied} occupied
              </span>
            </div>
            <div className="parking-capacity-card parking-capacity-card--live">
              <span className="parking-capacity-card-label">Live occupancy</span>
              <strong>
                {slotCounts.total
                  ? Math.round((slotCounts.occupied / slotCounts.total) * 100)
                  : 0}
                %
              </strong>
              <span className="parking-capacity-card-meta">
                {slotCounts.occupied} / {slotCounts.total} bays in use
              </span>
            </div>
          </div>

          <div className="parking-floor-gates parking-floor-gates--floor-one">
            <div className="parking-floor-gate parking-floor-gate--entry">
              <span className="parking-boom-gate" aria-hidden="true" />
              <span className="parking-floor-gate-label">Entry</span>
              <span className="parking-floor-arrow parking-floor-arrow--lane">
                ↓
              </span>
            </div>
            <div className="parking-floor-aisle-title" aria-hidden="true">
              Main drive aisle
            </div>
            <div className="parking-floor-gate parking-floor-gate--exit">
              <span className="parking-floor-arrow parking-floor-arrow--lane">
                ↓
              </span>
              <span className="parking-floor-gate-label">Exit</span>
              <span className="parking-boom-gate" aria-hidden="true" />
            </div>
          </div>
          </>
          ) : null}

          {showTwoWheelerZone ? (
          <section
            className="parking-floor-zone parking-floor-zone--two-wheeler"
            aria-labelledby="zone-a-heading"
          >
            <h4 id="zone-a-heading" className="parking-floor-zone-heading">
              {floorPlan.zoneTwoWheeler.title}
            </h4>
            <div className="parking-floor-zone-inner">
              {floorPlan.zoneTwoWheeler.rows.map((row, rowIndex) => (
                <div key={row.rowLabel} className="parking-floor-row-block">
                  <FloorPlanRow
                    rowLabel={row.rowLabel}
                    slots={row.slots}
                    selectedSlotId={selectedSlotId}
                    sessionsBySlotId={sessionsBySlotId}
                    onSelectSlot={onSelectSlot}
                    zone="two_wheeler"
                    entryPickerVehicleType={entryPickerVehicleType}
                  />
                  {rowIndex < floorPlan.zoneTwoWheeler.rows.length - 1 ? (
                    <div
                      className="parking-floor-drive-road"
                      aria-hidden="true"
                    >
                      <span className="parking-floor-drive-road-spacer" />
                      <div className="parking-floor-drive-road-track">
                        <span className="parking-floor-drive-road-edge" />
                        <span className="parking-floor-lane-line parking-floor-lane-line--drive" />
                        <span className="parking-floor-drive-road-arrows">
                          ← →
                        </span>
                        <span className="parking-floor-lane-line parking-floor-lane-line--drive" />
                        <span className="parking-floor-drive-road-edge" />
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
          ) : null}

          {showTwoWheelerZone && showFourWheelerZone ? (
          <div className="parking-floor-central-aisle" aria-hidden="true">
            <span className="parking-floor-central-aisle-label">
              Central driving aisle
            </span>
            <span className="parking-floor-central-aisle-arrows">↓ ↓ ↓</span>
            <span className="parking-floor-lane-line parking-floor-lane-line--central" />
          </div>
          ) : null}

          {showFourWheelerZone ? (
          <section
            className="parking-floor-zone parking-floor-zone--four-wheeler"
            aria-labelledby="zone-b-heading"
          >
            <h4 id="zone-b-heading" className="parking-floor-zone-heading">
              {floorPlan.zoneFourWheeler.title}
              <span className="parking-floor-zone-hint">
                Up to 2 motorcycles per bay when dedicated 2W zone is full
              </span>
            </h4>
            <div className="parking-floor-zone-inner">
              {floorPlan.zoneFourWheeler.rows.map((row, rowIndex) => (
                <div key={row.rowLabel} className="parking-floor-row-block">
                  <FloorPlanRow
                    rowLabel={row.rowLabel}
                    slots={row.slots}
                    selectedSlotId={selectedSlotId}
                    sessionsBySlotId={sessionsBySlotId}
                    onSelectSlot={onSelectSlot}
                    zone="four_wheeler"
                    entryPickerVehicleType={entryPickerVehicleType}
                  />
                  {rowIndex < floorPlan.zoneFourWheeler.rows.length - 1 ? (
                    <div className="parking-floor-mini-lane" aria-hidden="true">
                      <span className="parking-floor-lane-arrows">← ←</span>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
          ) : null}
        </div>
      </div>

      {!isEntryLayout ? (
      <aside className="parking-map-aside">
        <section className="parking-map-side-card" aria-labelledby="map-legend">
          <h4 id="map-legend" className="parking-map-side-title">
            Legend
          </h4>
          <ul className="parking-map-side-legend">
            <li>
              <span className="legend-swatch legend-swatch--available" />
              Available
            </li>
            <li>
              <span className="legend-swatch legend-swatch--occupied" />
              Occupied
            </li>
            <li>
              <span className="legend-swatch legend-swatch--selected" />
              Selected
            </li>
            <li>
              <span className="parking-map-zone-chip parking-map-zone-chip--2w">
                2W
              </span>
              Zone A — A01–A60
            </li>
            <li>
              <span className="parking-map-zone-chip parking-map-zone-chip--4w">
                4W
              </span>
              Zone B — B01–B40 (2 bike overflow)
            </li>
          </ul>
        </section>

        <div
          className="parking-map-details parking-map-details--expanded"
          aria-live="polite"
          aria-label="Selected bay details"
        >
          {selectedSlot ? (
            <>
              <h3 className="parking-map-details-title">
                Bay {selectedSlot.label}
              </h3>
              <dl className="parking-map-details-list">
                <div>
                  <dt>Bay type</dt>
                  <dd>{slotBayTypeLabel(selectedSlot.bayType)}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>
                    {selectedSlot.status === 'available'
                      ? 'Available'
                      : 'Occupied'}
                  </dd>
                </div>
                {selectedSlotSessions.length === 0 ? (
                  <div>
                    <dt>Vehicle</dt>
                    <dd>No vehicle assigned</dd>
                  </div>
                ) : (
                  selectedSlotSessions.map((session, index) => (
                    <div
                      key={session.id}
                      className="parking-map-details-session-block"
                    >
                      <dt>
                        {selectedSlotSessions.length > 1
                          ? `Vehicle ${index + 1}`
                          : 'Registration'}
                      </dt>
                      <dd>{session.registrationNumber}</dd>
                      <dt>Type</dt>
                      <dd>
                        {session.vehicleType.charAt(0).toUpperCase()}
                        {session.vehicleType.slice(1)}
                      </dd>
                      <dt>Entry</dt>
                      <dd>{formatEntryTime(session.entryTimestamp)}</dd>
                      <dt>Duration</dt>
                      <dd>
                        {formatDuration(
                          Math.max(
                            0,
                            calculateParkingDurationMs(
                              session.entryTimestamp,
                              asOfIso,
                            ),
                          ),
                        )}
                      </dd>
                      <dt>Est. fee</dt>
                      <dd>
                        <LiveParkingFeeEstimate
                          entryTimestamp={session.entryTimestamp}
                          vehicleType={session.vehicleType}
                          pricing={pricing}
                          nowMs={liveNowMs}
                          showDuration={false}
                        />
                      </dd>
                      {onRequestCheckout ? (
                        <dd className="parking-map-details-checkout">
                          <button
                            type="button"
                            className="parking-map-checkout-btn"
                            disabled={checkoutProcessing}
                            onClick={() => onRequestCheckout(session)}
                          >
                            Check out vehicle
                          </button>
                        </dd>
                      ) : null}
                    </div>
                  ))
                )}
              </dl>
            </>
          ) : (
            <p className="parking-map-details-empty">
              Select a bay on the floor plan to inspect occupants, fees, and
              checkout.
            </p>
          )}
        </div>
      </aside>
      ) : null}
    </div>
  )
}
