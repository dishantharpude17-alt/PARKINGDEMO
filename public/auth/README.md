# Login / register hero photo

Place `parking-garage-hero.jpg` here (portrait-friendly modern parking garage photograph).

Loaded at `/auth/parking-garage-hero.jpg`. If missing, the auth screen uses a CSS fallback.

On `npm run dev` / `npm run build`, `scripts/ensureAuthHeroAsset.mjs` copies from Cursor project assets when this file is missing.

Manual copy:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\copy-auth-assets.ps1
node scripts\ensureAuthHeroAsset.mjs
```
