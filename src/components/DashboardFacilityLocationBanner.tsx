import { useState, type CSSProperties } from 'react'
import type { OwnerFacilityProfile } from '../types/ownerFacility.ts'
import type { OwnerFacilityType } from '../types/ownerFacility.ts'
import { OWNER_FACILITY_TYPE_LABELS } from '../types/ownerFacility.ts'

const BANNER_PHOTO_BY_TYPE: Record<OwnerFacilityType, string> = {
  shopping_mall: '/facility-banners/shopping-mall.jpg',
  railway_station: '/facility-banners/railway-station.jpg',
  other: '/facility-banners/parking-facility.jpg',
}

type DashboardFacilityLocationBannerProps = {
  facility: OwnerFacilityProfile
}

function FacilityTypeIcon({ type }: { type: OwnerFacilityType }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }

  if (type === 'shopping_mall') {
    return (
      <svg {...common}>
        <path d="M4 10h16v10H4z" />
        <path d="M8 10V6h8v4" />
        <path d="M12 10v10" />
        <path d="M4 14h16" />
      </svg>
    )
  }

  if (type === 'railway_station') {
    return (
      <svg {...common}>
        <rect x="3" y="5" width="18" height="12" rx="2" />
        <path d="M3 11h18" />
        <path d="M7 17v2M17 17v2" />
        <circle cx="8" cy="15" r="1.25" fill="currentColor" stroke="none" />
        <circle cx="16" cy="15" r="1.25" fill="currentColor" stroke="none" />
      </svg>
    )
  }

  return (
    <svg {...common}>
      <path d="M4 20h16" />
      <path d="M6 20V9l6-4 6 4v11" />
      <path d="M10 20v-6h4v6" />
      <path d="M9 9h6" />
    </svg>
  )
}

export default function DashboardFacilityLocationBanner({
  facility,
}: DashboardFacilityLocationBannerProps) {
  const [photoAvailable, setPhotoAvailable] = useState(true)
  const typeLabel = OWNER_FACILITY_TYPE_LABELS[facility.facilityType]
  const photoSrc = BANNER_PHOTO_BY_TYPE[facility.facilityType]
  const bannerStyle = photoAvailable
    ? ({
        '--banner-photo': `url("${photoSrc}")`,
      } as CSSProperties)
    : undefined

  return (
    <section
      className={`dashboard-facility-banner dashboard-facility-banner--${facility.facilityType}${photoAvailable ? '' : ' dashboard-facility-banner--fallback'}`}
      style={bannerStyle}
      aria-label={`${facility.name} — ${typeLabel}`}
    >
      {photoAvailable ? (
        <img
          className="dashboard-facility-banner__photo"
          src={photoSrc}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          onError={() => setPhotoAvailable(false)}
        />
      ) : null}
      <div className="dashboard-facility-banner__scrim" aria-hidden="true" />
      <div className="dashboard-facility-banner__content">
        <p className="dashboard-facility-banner__badge">
          <FacilityTypeIcon type={facility.facilityType} />
          <span>Active facility</span>
        </p>
        <h3 className="dashboard-facility-banner__name">{facility.name}</h3>
        <p className="dashboard-facility-banner__type">{typeLabel}</p>
        <p className="dashboard-facility-banner__location">
          <span className="dashboard-facility-banner__address">
            {facility.address}
          </span>
          <span className="dashboard-facility-banner__city">{facility.city}</span>
        </p>
      </div>
    </section>
  )
}
