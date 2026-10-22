import type { OwnerFacilityProfile } from '../types/ownerFacility.ts'
import { OWNER_FACILITY_TYPE_LABELS } from '../types/ownerFacility.ts'

type FacilityLocationSummaryProps = {
  facility: OwnerFacilityProfile
  compact?: boolean
}

export default function FacilityLocationSummary({
  facility,
  compact = false,
}: FacilityLocationSummaryProps) {
  const typeLabel = OWNER_FACILITY_TYPE_LABELS[facility.facilityType]
  if (compact) {
    return (
      <p className="facility-location-summary facility-location-summary--compact">
        <span className="facility-location-name">{facility.name}</span>
        <span className="facility-location-meta">
          {typeLabel} · {facility.address}, {facility.city}
        </span>
      </p>
    )
  }

  return (
    <section
      className="panel facility-location-panel"
      aria-labelledby="facility-location-heading"
    >
      <h2 id="facility-location-heading" className="facility-location-title">
        Parking location
      </h2>
      <dl className="facility-location-details">
        <div>
          <dt>Facility</dt>
          <dd>{facility.name}</dd>
        </div>
        <div>
          <dt>Type</dt>
          <dd>{typeLabel}</dd>
        </div>
        <div>
          <dt>Address</dt>
          <dd>
            {facility.address}, {facility.city}
          </dd>
        </div>
      </dl>
    </section>
  )
}
