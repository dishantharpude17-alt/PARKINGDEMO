import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { ensureAuthHeroAsset } from './scripts/ensureAuthHeroAsset.mjs'
import { ensureFacilityBannerAssets } from './scripts/ensureFacilityBannerAssets.mjs'

ensureAuthHeroAsset()
ensureFacilityBannerAssets()

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
})
