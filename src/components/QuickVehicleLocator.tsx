import { useMemo, useState, type FormEvent } from 'react'
import { findActiveSessionsByRegistrationQuery } from '../logic/vehicleLocator.ts'
import type { ParkingSlot } from '../types/parkingSlot.ts'
import type { ParkingSession, VehicleType } from '../types/vehicleSession.ts'

const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  car: 'Car',
  motorcycle: 'Motorcycle',
  van: 'Van',
  truck: 'Truck',
}

type QuickVehicleLocatorProps = {
  sessions: readonly ParkingSession[]
  slots: readonly ParkingSlot[]
  slotLabelById: ReadonlyMap<string, string>
  onViewSlotOnMap: (slotId: string) => void
}

function parkingStatusLabel(
  session: ParkingSession,
  sessions: readonly ParkingSession[],
  slotStatus: ParkingSlot['status'] | undefined,
): string {
  const sharedCount = sessions.filter((s) => s.slotId === session.slotId).length
  if (sharedCount > 1) {
    return `Parked · shared bay (${sharedCount} active)`
  }
  if (slotStatus === 'occupied') {
    return 'Parked · bay occupied'
  }
  if (slotStatus === 'available') {
    return 'Active session (bay marked available — refresh map)'
  }
  return 'Parked · active session'
}

export default function QuickVehicleLocator({
  sessions,
  slots,
  slotLabelById,
  onViewSlotOnMap,
}: QuickVehicleLocatorProps) {
  const [query, setQuery] = useState('')
  const [searched, setSearched] = useState(false)

  const slotStatusById = useMemo(() => {
    const map = new Map<string, ParkingSlot['status']>()
    for (const slot of slots) {
      map.set(slot.id, slot.status)
    }
    return map
  }, [slots])

  const trimmedQuery = query.trim()

  const matches = useMemo(() => {
    if (!searched || !trimmedQuery) {
      return []
    }
    return findActiveSessionsByRegistrationQuery(sessions, trimmedQuery)
  }, [searched, sessions, trimmedQuery])

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSearched(true)
  }

  return (
    <section
      className="panel analytics-chart-panel analytics-chart-panel--rich analytics-chart-panel--quick-locator locator-panel"
      aria-labelledby="quick-locator-heading"
    >
      <div className="analytics-panel-head">
        <div className="quick-locator-head-copy">
          <h3 id="quick-locator-heading" className="analytics-panel-title">
            Quick vehicle locator
          </h3>
          <p className="panel-description panel-description--tight">
            Find an active session by registration and open its bay on the map.
          </p>
        </div>
      </div>

      <form
        className="locator-form quick-locator-form"
        onSubmit={handleSubmit}
        noValidate
      >
        <div className="field">
          <label htmlFor="quick-locator-query">Registration number</label>
          <input
            id="quick-locator-query"
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setSearched(false)
            }}
            placeholder="MH12AA1134"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <button type="submit" className="entry-submit quick-locator-search-btn">
          Search
        </button>
      </form>

      {!searched ? (
        <p className="locator-hint" role="status">
          Enter a registration and search active sessions.
        </p>
      ) : trimmedQuery === '' ? (
        <p className="locator-result locator-result--empty" role="status">
          Enter a registration number to search parked vehicles.
        </p>
      ) : matches.length === 0 ? (
        <p className="locator-result locator-result--empty" role="status">
          No active parked vehicle matches &ldquo;{trimmedQuery}&rdquo;.
        </p>
      ) : (
        <ul className="locator-results quick-locator-results" aria-live="polite">
          {matches.map((session) => (
            <li key={session.id}>
              <article className="quick-locator-match">
                <header className="quick-locator-match-head">
                  <p className="locator-reg">{session.registrationNumber}</p>
                  <span className="quick-locator-type">
                    {VEHICLE_TYPE_LABELS[session.vehicleType]}
                  </span>
                </header>
                <dl className="quick-locator-details">
                  <div>
                    <dt>Assigned slot</dt>
                    <dd>
                      {slotLabelById.get(session.slotId) ?? session.slotId}
                    </dd>
                  </div>
                  <div>
                    <dt>Parking status</dt>
                    <dd>
                      {parkingStatusLabel(
                        session,
                        sessions,
                        slotStatusById.get(session.slotId),
                      )}
                    </dd>
                  </div>
                </dl>
                <button
                  type="button"
                  className="dashboard-view-all-btn quick-locator-map-btn"
                  onClick={() => onViewSlotOnMap(session.slotId)}
                >
                  View on Parking Slots
                </button>
              </article>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
