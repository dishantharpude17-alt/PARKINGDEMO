import { useId } from 'react'
import type { VehicleType } from '../types/vehicleSession.ts'

type DashboardVehicleIllustrationProps = {
  type: VehicleType
  className?: string
}

/** Polished three-quarter silhouettes for dashboard analytics cards. */
export default function DashboardVehicleIllustration({
  type,
  className = 'dashboard-vehicle-ill',
}: DashboardVehicleIllustrationProps) {
  const instanceId = useId().replace(/:/g, '')
  const gradId = `dashboard-veh-body-${type}-${instanceId}`
  const common = {
    className: `${className} dashboard-vehicle-ill--${type}`,
    viewBox: '0 0 96 56',
    xmlns: 'http://www.w3.org/2000/svg',
    'aria-hidden': true as const,
  }

  const bodyGrad = (
    <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" className={`dashboard-vehicle-ill-grad-stop dashboard-vehicle-ill-grad-stop--${type}-a`} />
      <stop offset="100%" className={`dashboard-vehicle-ill-grad-stop dashboard-vehicle-ill-grad-stop--${type}-b`} />
    </linearGradient>
  )

  switch (type) {
    case 'motorcycle':
      return (
        <svg {...common}>
          <defs>{bodyGrad}</defs>
          <ellipse cx="48" cy="50" rx="22" ry="4" className="dashboard-vehicle-ill-shadow" />
          <circle cx="28" cy="44" r="7" className="dashboard-vehicle-ill-wheel" />
          <circle cx="64" cy="44" r="7" className="dashboard-vehicle-ill-wheel" />
          <circle cx="28" cy="44" r="3.5" className="dashboard-vehicle-ill-wheel-hub" />
          <circle cx="64" cy="44" r="3.5" className="dashboard-vehicle-ill-wheel-hub" />
          <path
            className="dashboard-vehicle-ill-motorcycle-frame"
            d="M28 44 L38 28 L52 22 L68 26 L64 44"
          />
          <path
            className="dashboard-vehicle-ill-motorcycle-body"
            fill={`url(#${gradId})`}
            d="M40 26 C36 18 44 12 52 14 C58 16 62 22 58 28 L48 32 Z"
          />
          <path
            className="dashboard-vehicle-ill-motorcycle-seat"
            d="M44 28 C48 24 56 24 60 30 L56 34 C52 30 46 30 44 28 Z"
          />
          <path
            className="dashboard-vehicle-ill-motorcycle-bar"
            d="M36 20 Q48 10 62 18"
            fill="none"
            strokeWidth="2.5"
          />
          <path
            className="dashboard-vehicle-ill-highlight"
            d="M46 16 Q54 14 58 20"
            fill="none"
            strokeWidth="1.5"
          />
        </svg>
      )
    case 'van':
      return (
        <svg {...common}>
          <defs>{bodyGrad}</defs>
          <ellipse cx="48" cy="50" rx="30" ry="4.5" className="dashboard-vehicle-ill-shadow" />
          <rect
            x="18"
            y="18"
            width="52"
            height="26"
            rx="4"
            className="dashboard-vehicle-ill-van-cargo"
            fill={`url(#${gradId})`}
          />
          <path
            className="dashboard-vehicle-ill-van-cab"
            d="M18 28 H34 C38 28 42 24 42 20 V18 H18 Z"
          />
          <rect x="22" y="20" width="14" height="10" rx="1.5" className="dashboard-vehicle-ill-glass" />
          <circle cx="30" cy="46" r="5" className="dashboard-vehicle-ill-wheel" />
          <circle cx="62" cy="46" r="5" className="dashboard-vehicle-ill-wheel" />
        </svg>
      )
    case 'truck':
      return (
        <svg {...common}>
          <defs>{bodyGrad}</defs>
          <ellipse cx="48" cy="50" rx="32" ry="4.5" className="dashboard-vehicle-ill-shadow" />
          <rect
            x="44"
            y="22"
            width="38"
            height="22"
            rx="2"
            className="dashboard-vehicle-ill-truck-bed"
          />
          <path
            className="dashboard-vehicle-ill-truck-cab"
            fill={`url(#${gradId})`}
            d="M16 44 V24 C16 20 19 17 23 17 H38 C42 17 45 20 45 24 V44 Z"
          />
          <rect x="20" y="20" width="16" height="12" rx="1.5" className="dashboard-vehicle-ill-glass" />
          <rect x="48" y="28" width="28" height="3" rx="1" className="dashboard-vehicle-ill-truck-strip" />
          <circle cx="26" cy="46" r="5" className="dashboard-vehicle-ill-wheel" />
          <circle cx="68" cy="46" r="5" className="dashboard-vehicle-ill-wheel" />
        </svg>
      )
    case 'car':
    default:
      return (
        <svg {...common}>
          <defs>{bodyGrad}</defs>
          <ellipse cx="48" cy="50" rx="28" ry="4.5" className="dashboard-vehicle-ill-shadow" />
          <path
            className="dashboard-vehicle-ill-car-body"
            fill={`url(#${gradId})`}
            d="M18 38 C18 32 22 28 28 26 L34 22 C38 18 58 18 62 22 L68 26 C74 28 78 32 78 38 V42 C78 45 75 47 72 47 H24 C21 47 18 45 18 42 Z"
          />
          <path
            className="dashboard-vehicle-ill-car-roof"
            d="M32 26 L40 20 H56 L64 26 L60 34 H36 Z"
          />
          <rect x="34" y="22" width="10" height="8" rx="1" className="dashboard-vehicle-ill-glass" />
          <rect x="52" y="22" width="10" height="8" rx="1" className="dashboard-vehicle-ill-glass" />
          <path
            className="dashboard-vehicle-ill-highlight"
            d="M36 28 H58"
            fill="none"
            strokeWidth="1.5"
          />
          <circle cx="28" cy="44" r="5" className="dashboard-vehicle-ill-wheel" />
          <circle cx="68" cy="44" r="5" className="dashboard-vehicle-ill-wheel" />
        </svg>
      )
  }
}
