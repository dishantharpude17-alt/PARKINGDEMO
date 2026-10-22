import type { VehicleType } from '../types/vehicleSession.ts'

type VehicleTopDownIconProps = {
  type: VehicleType
  className?: string
}

/** Top-down parking bay silhouettes — themed via CSS classes on SVG parts. */
export default function VehicleTopDownIcon({
  type,
  className = 'parking-bay-vehicle-art',
}: VehicleTopDownIconProps) {
  const common = {
    className: `${className} vehicle-map-icon vehicle-map-icon--${type}`,
    viewBox: '0 0 48 64',
    xmlns: 'http://www.w3.org/2000/svg',
    'aria-hidden': true as const,
  }

  switch (type) {
    case 'motorcycle':
      return (
        <svg {...common}>
          <ellipse
            className="vehicle-map-motorcycle-shadow"
            cx="24"
            cy="41"
            rx="9"
            ry="14"
          />
          <path
            className="vehicle-map-motorcycle-body"
            d="M24 9c-2.5 0-4.5 2-4.5 4.5v3.5c0 2 1.2 3.8 3 4.5v14.5c0 3.5 2.8 6.5 6.5 6.5h0c3.7 0 6.5-3 6.5-6.5V21.5c1.8-.7 3-2.5 3-4.5V13.5C38.5 11 36.5 9 34 9H24Z"
          />
          <ellipse
            className="vehicle-map-motorcycle-seat"
            cx="24"
            cy="34"
            rx="4.5"
            ry="9"
          />
          <ellipse
            className="vehicle-map-motorcycle-tank"
            cx="24"
            cy="20"
            rx="3.8"
            ry="5.5"
          />
          <path
            className="vehicle-map-motorcycle-handlebar"
            d="M13 13.5 Q24 7 35 13.5"
            strokeWidth="2.25"
            strokeLinecap="round"
            fill="none"
          />
          <circle className="vehicle-map-wheel" cx="24" cy="11.5" r="3.25" />
          <circle className="vehicle-map-wheel" cx="17.5" cy="51" r="3.35" />
          <circle className="vehicle-map-wheel" cx="30.5" cy="51" r="3.35" />
        </svg>
      )
    case 'van':
      return (
        <svg {...common}>
          <rect
            className="vehicle-map-van-body"
            x="10"
            y="6"
            width="28"
            height="52"
            rx="4"
          />
          <rect
            className="vehicle-map-van-cab"
            x="12"
            y="8"
            width="24"
            height="14"
            rx="2"
          />
          <rect
            className="vehicle-map-van-rear"
            x="12"
            y="44"
            width="24"
            height="10"
            rx="1"
          />
          <rect
            className="vehicle-map-van-mid"
            x="14"
            y="26"
            width="20"
            height="14"
            rx="1"
          />
        </svg>
      )
    case 'truck':
      return (
        <svg {...common}>
          <rect
            className="vehicle-map-truck-bed"
            x="8"
            y="28"
            width="32"
            height="30"
            rx="2"
          />
          <rect
            className="vehicle-map-truck-cab"
            x="12"
            y="8"
            width="18"
            height="22"
            rx="3"
          />
          <rect
            className="vehicle-map-truck-window"
            x="14"
            y="10"
            width="14"
            height="10"
            rx="1.5"
          />
          <rect
            className="vehicle-map-truck-strip"
            x="10"
            y="32"
            width="28"
            height="4"
            rx="1"
          />
          <circle className="vehicle-map-wheel" cx="16" cy="58" r="3" />
          <circle className="vehicle-map-wheel" cx="32" cy="58" r="3" />
        </svg>
      )
    case 'car':
    default:
      return (
        <svg {...common}>
          <path
            className="vehicle-map-car-shadow"
            d="M14 54h20c4 0 7-3 7-7V20c0-6-5-10-11-10h-2C22 10 17 14 17 20v27c0 4 3 7 7 7Z"
          />
          <path
            className="vehicle-map-car-body"
            d="M15 12h18c5 0 9 4 9 9v26c0 4.5-3.5 8-8 8H16c-4.5 0-8-3.5-8-8V21c0-5 4-9 9-9Z"
          />
          <path
            className="vehicle-map-car-hood"
            d="M17 14h14c3 0 5.5 2.5 5.5 5.5V22H17v-8Z"
          />
          <path
            className="vehicle-map-car-roof"
            d="M18 22h12l-1.5 11H19.5L18 22Z"
          />
          <rect
            className="vehicle-map-car-sunroof"
            x="21"
            y="24"
            width="6"
            height="7"
            rx="1"
          />
          <path
            className="vehicle-map-car-trunk"
            d="M19 36h10v8c0 2-1.5 3.5-3.5 3.5h-3C20.5 47.5 19 46 19 44v-8Z"
          />
          <ellipse className="vehicle-map-wheel" cx="15.5" cy="49" rx="2.75" ry="3.75" />
          <ellipse className="vehicle-map-wheel" cx="32.5" cy="49" rx="2.75" ry="3.75" />
          <rect
            className="vehicle-map-car-mirror"
            x="11"
            y="26"
            width="3"
            height="5"
            rx="1"
          />
          <rect
            className="vehicle-map-car-mirror"
            x="34"
            y="26"
            width="3"
            height="5"
            rx="1"
          />
        </svg>
      )
  }
}
