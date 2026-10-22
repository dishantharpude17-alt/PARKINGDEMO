export type EnsureAuthHeroAssetResult = {
  ok: boolean
  dest: string
  copied: boolean
  size?: number
  source?: string
}

export function ensureAuthHeroAsset(): EnsureAuthHeroAssetResult
