# Dashboard scenic banner photos (16:9)

Place these JPEG files in this folder (same names):

- `shopping-mall.jpg` — Mall facility type  
- `railway-station.jpg` — Railway station facility type  
- `parking-facility.jpg` — Other facility type  

They are loaded at runtime from `/facility-banners/*.jpg` (no CDN). If a file is missing, the dashboard banner uses a themed CSS fallback until you add the image.

On `npm run dev` / `npm run build`, `scripts/ensureFacilityBannerAssets.mjs` copies from Cursor project assets when files are missing.

```powershell
powershell -ExecutionPolicy Bypass -File scripts\copy-facility-banners.ps1
node scripts\ensureFacilityBannerAssets.mjs
```
