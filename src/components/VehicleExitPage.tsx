import { useMemo, useState, type FormEvent } from 'react'
import {
  findActiveSessionsByRegistrationQuery,
  resolveActiveSessionsForPlate,
} from '../logic/vehicleLocator.ts'
import VehiclePhotoCapture from './VehiclePhotoCapture.tsx'
import type { VehiclePhotoRecognitionResult } from '../logic/vehiclePhotoRecognition.ts'
import LiveParkingFeeEstimate from './LiveParkingFeeEstimate.tsx'
import type { PricingOptions } from '../types/appSettings.ts'
import type { ParkingSession, VehicleType } from '../types/vehicleSession.ts'

const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  car: 'Car',
  motorcycle: 'Motorcycle',
  van: 'Van',
  truck: 'Truck',
}

type VehicleExitPageProps = {
  sessions: readonly ParkingSession[]
  slotLabelById: ReadonlyMap<string, string>
  pricing: PricingOptions
  nowMs: number
  formatTimestamp: (iso: string) => string
  onRequestCheckout: (session: ParkingSession) => void
  checkoutProcessing: boolean
  onViewSlotOnMap: (slotId: string) => void
}

function sortSessionsByEntry(sessions: readonly ParkingSession[]): ParkingSession[] {
  return [...sessions].sort(
    (a, b) =>
      new Date(a.entryTimestamp).getTime() -
      new Date(b.entryTimestamp).getTime(),
  )
}

type SessionCheckoutCardProps = {
  session: ParkingSession
  slotLabelById: ReadonlyMap<string, string>
  pricing: PricingOptions
  nowMs: number
  formatTimestamp: (iso: string) => string
  checkoutProcessing: boolean
  onRequestCheckout: (session: ParkingSession) => void
  onViewSlotOnMap: (slotId: string) => void
}

function SessionCheckoutCard({
  session,
  slotLabelById,
  pricing,
  nowMs,
  formatTimestamp,
  checkoutProcessing,
  onRequestCheckout,
  onViewSlotOnMap,
}: SessionCheckoutCardProps) {
  return (
    <li>
      <article className="vehicle-exit-card">
        <header className="vehicle-exit-card-head">
          <h3 className="vehicle-exit-reg">{session.registrationNumber}</h3>
          <span className="vehicle-exit-type">
            {VEHICLE_TYPE_LABELS[session.vehicleType]}
          </span>
        </header>
        <dl className="vehicle-exit-details">
          <div>
            <dt>Parking slot</dt>
            <dd>{slotLabelById.get(session.slotId) ?? session.slotId}</dd>
          </div>
          <div>
            <dt>Entry time</dt>
            <dd>{formatTimestamp(session.entryTimestamp)}</dd>
          </div>
          <div>
            <dt>Elapsed duration</dt>
            <dd>
              <LiveParkingFeeEstimate
                entryTimestamp={session.entryTimestamp}
                vehicleType={session.vehicleType}
                pricing={pricing}
                nowMs={nowMs}
                showFee={false}
              />
            </dd>
          </div>
          <div>
            <dt>Estimated charge</dt>
            <dd>
              <LiveParkingFeeEstimate
                entryTimestamp={session.entryTimestamp}
                vehicleType={session.vehicleType}
                pricing={pricing}
                nowMs={nowMs}
                showDuration={false}
              />
            </dd>
          </div>
        </dl>
        <div className="vehicle-exit-card-actions">
          <button
            type="button"
            className="dashboard-view-all-btn"
            onClick={() => onViewSlotOnMap(session.slotId)}
          >
            View on Parking Slots
          </button>
          <button
            type="button"
            className="checkout-btn entry-submit vehicle-exit-checkout-btn"
            disabled={checkoutProcessing}
            onClick={() => onRequestCheckout(session)}
          >
            Proceed to checkout
          </button>
        </div>
      </article>
    </li>
  )
}

export default function VehicleExitPage({
  sessions,
  slotLabelById,
  pricing,
  nowMs,
  formatTimestamp,
  onRequestCheckout,
  checkoutProcessing,
  onViewSlotOnMap,
}: VehicleExitPageProps) {
  const [query, setQuery] = useState('')
  const [recognitionMessage, setRecognitionMessage] = useState<string | null>(
    null,
  )
  const [recognitionError, setRecognitionError] = useState<string | null>(null)

  const trimmedQuery = query.trim()

  const filteredActiveSessions = useMemo(() => {
    const sorted = sortSessionsByEntry(sessions)
    if (!trimmedQuery) {
      return sorted
    }
    return sortSessionsByEntry(
      findActiveSessionsByRegistrationQuery(sessions, trimmedQuery),
    )
  }, [sessions, trimmedQuery])

  function handleRecognitionResult(result: VehiclePhotoRecognitionResult) {
    setRecognitionError(null)
    setRecognitionMessage(null)
    if (!result.ok) {
      setRecognitionError(result.error)
      return
    }
    setQuery(result.registrationNumber)
    const resolved = resolveActiveSessionsForPlate(
      sessions,
      result.registrationNumber,
    )
    setRecognitionMessage(
      resolved.length > 0
        ? `Recognized ${result.registrationNumber}. Active session listed below — proceed to checkout when ready.`
        : `Recognized ${result.registrationNumber}, but no active session matches. Search the list or enter manually.`,
    )
  }

  function handleSearchSubmit(event: FormEvent) {
    event.preventDefault()
  }

  return (
    <section
      className="panel view-single vehicle-exit-panel"
      aria-labelledby="vehicle-exit-heading"
    >
      <h2 id="vehicle-exit-heading" className="sr-only">
        Vehicle exit
      </h2>
      <p className="panel-description">
        Review active sessions, estimated fees, and complete checkout with
        payment.
      </p>

      <VehiclePhotoCapture
        purpose="exit"
        disabled={checkoutProcessing}
        onRecognitionResult={handleRecognitionResult}
      />

      {recognitionError ? (
        <p className="form-message form-message--error" role="alert">
          {recognitionError}
        </p>
      ) : null}
      {recognitionMessage ? (
        <p className="form-message form-message--success" role="status">
          {recognitionMessage}
        </p>
      ) : null}

      <section
        className="vehicle-exit-active-list"
        aria-labelledby="vehicle-exit-active-heading"
      >
        <header className="vehicle-exit-active-head">
          <div>
            <h3 id="vehicle-exit-active-heading" className="vehicle-exit-active-title">
              Active parked vehicles
            </h3>
            <p className="panel-description panel-description--tight">
              {sessions.length === 0
                ? 'No vehicles are currently parked.'
                : `${sessions.length} active session${sessions.length === 1 ? '' : 's'} — each checkout is confirmed before the slot is released.`}
            </p>
          </div>
        </header>

        <form
          className="locator-form vehicle-exit-search"
          onSubmit={handleSearchSubmit}
          noValidate
        >
          <div className="field">
            <label htmlFor="vehicle-exit-query">Search by registration</label>
            <input
              id="vehicle-exit-query"
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setRecognitionError(null)
                setRecognitionMessage(null)
              }}
              placeholder="MH12AA1134"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <button type="submit" className="entry-submit vehicle-exit-filter-btn">
            Search
          </button>
        </form>

        {sessions.length === 0 ? (
          <p className="locator-result locator-result--empty" role="status">
            No active parked vehicles. Completed checkouts appear in parking
            history.
          </p>
        ) : trimmedQuery !== '' && filteredActiveSessions.length === 0 ? (
          <p className="locator-result locator-result--empty" role="status">
            No active session matches &ldquo;{trimmedQuery}&rdquo;. Clear the
            search to see all parked vehicles.
          </p>
        ) : (
          <ul className="vehicle-exit-results" aria-live="polite">
            {filteredActiveSessions.map((session) => (
              <SessionCheckoutCard
                key={session.id}
                session={session}
                slotLabelById={slotLabelById}
                pricing={pricing}
                nowMs={nowMs}
                formatTimestamp={formatTimestamp}
                checkoutProcessing={checkoutProcessing}
                onRequestCheckout={onRequestCheckout}
                onViewSlotOnMap={onViewSlotOnMap}
              />
            ))}
          </ul>
        )}
      </section>
    </section>
  )
}
