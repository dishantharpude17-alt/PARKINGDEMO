export type EnsureFacilityBannerAssetResult = {
  fileName: string
  ok: boolean
  copied: boolean
  size?: number
  source?: string
}

export type EnsureFacilityBannerAssetsResult = {
  ok: boolean
  results: EnsureFacilityBannerAssetResult[]
}

export function ensureFacilityBannerAssets(): EnsureFacilityBannerAssetsResult
