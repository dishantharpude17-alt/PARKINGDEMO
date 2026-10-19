import { useMemo } from 'react'
import LiveParkingFeeEstimate from './LiveParkingFeeEstimate.tsx'
import { groupSlotsForParkingMap } from '../logic/parkingMapLayout.ts'
import {
  calculateParkingDurationMs,
  formatDuration,
} from '../logic/parkingFees.ts'
import type { PricingOptions } from '../types/appSettings.ts'
import type { ParkingSlot } from '../types/parkingSlot.ts'
import type { ParkingSession, VehicleType } from '../types/vehicleSession.ts'

type ParkingMapProps = {
  slots: readonly ParkingSlot[]
  selectedSlotId: string | null
  onSelectSlot: (slotId: string) => void
  sessionBySlotId: ReadonlyMap<string, ParkingSession>
  formatEntryTime: (iso: string) => string
  pricing: PricingOptions
  liveNowMs: number
}

const VEHICLE_TYPE_GUIDE: { type: VehicleType; label: string; hint: string }[] =
  [
    { type: 'motorcycle', label: 'Motorcycle', hint: 'Two-wheeler' },
    { type: 'car', label: 'Car', hint: 'Standard vehicle' },
    { type: 'van', label: 'Van', hint: 'Large vehicle' },
    { type: 'truck', label: 'Truck', hint: 'Heavy vehicle' },
  ]

function VehicleTopDownIcon({ type }: { type: VehicleType }) {
  const className = 'parking-bay-vehicle-art'
  const ariaHidden = true

  switch (type) {
    case 'motorcycle':
      return (
        <svg className={className} viewBox="0 0 40 56" aria-hidden={ariaHidden}>
          <ellipse cx="20" cy="34" rx="8" ry="14" fill="#c62828" />
          <ellipse cx="20" cy="34" rx="5" ry="10" fill="#ef5350" />
          <circle cx="20" cy="14" r="5" fill="#37474f" />
          <rect x="18" y="18" width="4" height="12" rx="2" fill="#78909c" />
        </svg>
      )
    case 'van':
      return (
        <svg className={className} viewBox="0 0 40 56" aria-hidden={ariaHidden}>
          <rect x="8" y="6" width="24" height="44" rx="4" fill="#eceff1" />
          <rect x="10" y="8" width="20" height="12" rx="2" fill="#546e7a" />
          <rect x="10" y="38" width="20" height="8" rx="1" fill="#b0bec5" />
        </svg>
      )
    case 'truck':
      return (
        <svg className={className} viewBox="0 0 40 56" aria-hidden={ariaHidden}>
          <rect x="6" y="22" width="28" height="28" rx="2" fill="#cfd8dc" />
          <rect x="8" y="6" width="16" height="18" rx="2" fill="#eceff1" />
          <rect x="10" y="8" width="12" height="8" rx="1" fill="#607d8b" />
        </svg>
      )
    case 'car':
    default:
      return (
        <svg className={className} viewBox="0 0 40 56" aria-hidden={ariaHidden}>
          <rect x="9" y="10" width="22" height="38" rx="5" fill="#f5f5f5" />
          <rect x="11" y="12" width="18" height="12" rx="2" fill="#455a64" />
          <rect x="11" y="36" width="18" height="8" rx="1" fill="#bdbdbd" />
          <ellipse cx="12" cy="42" rx="2" ry="3" fill="#263238" />
          <ellipse cx="28" cy="42" rx="2" ry="3" fill="#263238" />
        </svg>
      )
  }
}

function VehicleTypeLegendIcon({ type }: { type: VehicleType }) {
  return (
    <span className="parking-side-vehicle-icon" aria-hidden="true">
      <VehicleTopDownIcon type={type} />
    </span>
  )
}

export default function ParkingMap({
  slots,
  selectedSlotId,
  onSelectSlot,
  sessionBySlotId,
  formatEntryTime,
  pricing,
  liveNowMs,
}: ParkingMapProps) {
  const rows = groupSlotsForParkingMap(slots)
  const slotCounts = useMemo(() => {
    let available = 0
    let occupied = 0
    for (const slot of slots) {
      if (slot.status === 'available') {
        available += 1
      } else {
        occupied += 1
      }
    }
    return { available, occupied, total: slots.length }
  }, [slots])

  const selectedSlot =
    selectedSlotId !== null
      ? slots.find((slot) => slot.id === selectedSlotId) ?? null
      : null
  const selectedSession = selectedSlot
    ? sessionBySlotId.get(selectedSlot.id)
    : undefined

  const asOfIso = new Date(liveNowMs).toISOString()

  return (
    <div className="parking-map">
      <div
        className="parking-map-canvas parking-floor-plan parking-floor-perimeter"
        role="group"
        aria-label="Parking lot floor plan"
      >
        <header className="parking-floor-header">
          <h3 className="parking-floor-title">Parking lot — floor plan view</h3>
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
          </ul>
        </header>

        <div className="parking-floor-gates">
          <div className="parking-floor-gate parking-floor-gate--entry">
            <span className="parking-boom-gate" aria-hidden="true" />
            <span className="parking-floor-gate-label">Entry</span>
            <span className="parking-floor-arrow parking-floor-arrow--lane">
              →
            </span>
          </div>
          <div className="parking-floor-gate parking-floor-gate--exit">
            <span className="parking-floor-arrow parking-floor-arrow--lane">
              →
            </span>
            <span className="parking-floor-gate-label">Exit</span>
            <span className="parking-boom-gate" aria-hidden="true" />
          </div>
        </div>

        <div className="parking-floor-column-labels" aria-hidden="true">
          <span className="parking-floor-column-spacer" />
          <span>1</span>
          <span>2</span>
          <span>3</span>
          <span>4</span>
        </div>

        <div className="parking-floor-rows">
          {rows.map((row, rowIndex) => (
            <div key={row.rowLabel} className="parking-floor-row-block">
              <div className="parking-map-row">
                <span className="parking-map-row-label">{row.rowLabel}</span>
                <ul className="parking-map-bays">
                  {row.slots.map((slot) => {
                    const isSelected = slot.id === selectedSlotId
                    const session = sessionBySlotId.get(slot.id)
                    const isAvailable = slot.status === 'available'
                    const statusLabel = isAvailable ? 'Available' : 'Occupied'
                    const displayStatus = isSelected ? 'Selected' : statusLabel
                    const durationLabel =
                      session && !isAvailable
                        ? formatDuration(
                            Math.max(
                              0,
                              calculateParkingDurationMs(
                                session.entryTimestamp,
                                asOfIso,
                              ),
                            ),
                          )
                        : null

                    return (
                      <li key={slot.id}>
                        <button
                          type="button"
                          className={`parking-map-bay parking-map-bay--${slot.status}${isSelected ? ' is-selected' : ''}`}
                          aria-pressed={isSelected}
                          aria-label={`Slot ${slot.label}, ${displayStatus}${session ? `, ${session.registrationNumber}` : ''}${durationLabel ? `, ${durationLabel}` : ''}`}
                          onClick={() => onSelectSlot(slot.id)}
                        >
                          <span
                            className={`parking-status-dot parking-status-dot--${isSelected ? 'selected' : isAvailable ? 'available' : 'occupied'}`}
                          />
                          <span className="parking-map-bay-label">
                            {slot.label}
                          </span>
                          {isAvailable ? (
                            <>
                              <span className="parking-bay-open-indicator">
                                Open
                              </span>
                              <span className="parking-map-bay-status">
                                {displayStatus}
                              </span>
                            </>
                          ) : (
                            <>
                              <VehicleTopDownIcon
                                type={session?.vehicleType ?? 'car'}
                              />
                              <span className="parking-map-bay-status">
                                {displayStatus}
                              </span>
                              {session ? (
                                <>
                                  <span className="parking-map-bay-reg">
                                    {session.registrationNumber}
                                  </span>
                                  {durationLabel ? (
                                    <span className="parking-map-bay-duration">
                                      {durationLabel}
                                    </span>
                                  ) : null}
                                </>
                              ) : null}
                            </>
                          )}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
              {rowIndex < rows.length - 1 ? (
                <div className="parking-floor-lane" aria-hidden="true">
                  <span className="parking-floor-lane-line" />
                  <span className="parking-floor-lane-arrows">
                    {rowIndex % 2 === 0 ? '→  →' : '←  ←'}
                  </span>
                  <span className="parking-floor-lane-line" />
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <aside className="parking-map-sidebar">
        <section className="parking-map-side-card" aria-labelledby="map-legend">
          <h4 id="map-legend" className="parking-map-side-title">
            Slot legend
          </h4>
          <ul className="parking-map-side-legend">
            <li>
              <span className="legend-swatch legend-swatch--available" />
              Available — open bay
            </li>
            <li>
              <span className="legend-swatch legend-swatch--occupied" />
              Occupied — vehicle parked
            </li>
            <li>
              <span className="legend-swatch legend-swatch--selected" />
              Selected — active inspection
            </li>
          </ul>
        </section>

        <section
          className="parking-map-side-card"
          aria-labelledby="vehicle-types"
        >
          <h4 id="vehicle-types" className="parking-map-side-title">
            Vehicle types
          </h4>
          <ul className="parking-map-vehicle-types">
            {VEHICLE_TYPE_GUIDE.map((item) => (
              <li key={item.type}>
                <VehicleTypeLegendIcon type={item.type} />
                <span>
                  <strong>{item.label}</strong>
                  <span className="parking-map-vehicle-hint">
                    {item.hint}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section
          className="parking-map-side-card parking-map-summary"
          aria-labelledby="parking-summary"
        >
          <h4 id="parking-summary" className="parking-map-side-title">
            Parking summary
          </h4>
          <dl className="parking-map-summary-list">
            <div>
              <dt>
                <span className="parking-status-dot parking-status-dot--available" />
                Available
              </dt>
              <dd>{slotCounts.available}</dd>
            </div>
            <div>
              <dt>
                <span className="parking-status-dot parking-status-dot--occupied" />
                Occupied
              </dt>
              <dd>{slotCounts.occupied}</dd>
            </div>
            <div>
              <dt>Total slots</dt>
              <dd>{slotCounts.total}</dd>
            </div>
          </dl>
        </section>

        <div
          className="parking-map-details"
          aria-live="polite"
          aria-label="Selected slot details"
        >
          {selectedSlot ? (
            <>
              <h3 className="parking-map-details-title">
                Slot {selectedSlot.label}
              </h3>
              <dl className="parking-map-details-list">
                <div>
                  <dt>Status</dt>
                  <dd>
                    {selectedSlot.status === 'available'
                      ? 'Available'
                      : 'Occupied'}
                  </dd>
                </div>
                {selectedSession ? (
                  <>
                    <div>
                      <dt>Registration</dt>
                      <dd>{selectedSession.registrationNumber}</dd>
                    </div>
                    <div>
                      <dt>Vehicle type</dt>
                      <dd>
                        {selectedSession.vehicleType.charAt(0).toUpperCase()}
                        {selectedSession.vehicleType.slice(1)}
                      </dd>
                    </div>
                    <div>
                      <dt>Entry</dt>
                      <dd>{formatEntryTime(selectedSession.entryTimestamp)}</dd>
                    </div>
                    <div>
                      <dt>Duration</dt>
                      <dd>
                        <LiveParkingFeeEstimate
                          entryTimestamp={selectedSession.entryTimestamp}
                          vehicleType={selectedSession.vehicleType}
                          pricing={pricing}
                          nowMs={liveNowMs}
                          showFee={false}
                        />
                      </dd>
                    </div>
                    <div>
                      <dt>Est. fee</dt>
                      <dd>
                        <LiveParkingFeeEstimate
                          entryTimestamp={selectedSession.entryTimestamp}
                          vehicleType={selectedSession.vehicleType}
                          pricing={pricing}
                          nowMs={liveNowMs}
                          showDuration={false}
                        />
                      </dd>
                    </div>
                  </>
                ) : (
                  <div>
                    <dt>Vehicle</dt>
                    <dd>No vehicle assigned</dd>
                  </div>
                )}
              </dl>
            </>
          ) : (
            <p className="parking-map-details-empty">
              Select a slot on the map to view details.
            </p>
          )}
        </div>
      </aside>
    </div>
  )
}
