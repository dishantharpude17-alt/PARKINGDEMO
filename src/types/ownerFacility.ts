export type OwnerFacilityType = 'railway_station' | 'shopping_mall' | 'other'

export type OwnerFacilityProfile = {
  name: string
  facilityType: OwnerFacilityType
  address: string
  city: string
}

export const OWNER_FACILITY_TYPE_LABELS: Record<OwnerFacilityType, string> = {
  railway_station: 'Railway station',
  shopping_mall: 'Mall',
  other: 'Other',
}
