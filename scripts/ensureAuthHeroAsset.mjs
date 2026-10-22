import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.join(__dirname, '..')
const dest = path.join(projectRoot, 'public', 'auth', 'parking-garage-hero.jpg')

function copyFrom(source) {
  if (!source || !fs.existsSync(source)) {
    return false
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.copyFileSync(source, dest)
  return true
}

/**
 * Ensures `public/auth/parking-garage-hero.jpg` exists for `/auth/parking-garage-hero.jpg`.
 * @returns {{ ok: boolean; dest: string; copied: boolean; size?: number; source?: string }}
 */
export function ensureAuthHeroAsset() {
  if (fs.existsSync(dest)) {
    const size = fs.statSync(dest).size
    if (size > 0) {
      return { ok: true, dest, copied: false, size }
    }
  }

  const sources = [
    process.env.PARKINGDEMO_AUTH_HERO_SOURCE,
    path.join(projectRoot, 'assets', 'parking-garage-hero.jpg'),
    path.join(
      os.homedir(),
      '.cursor',
      'projects',
      'c-Users-Admin-Desktop-PARKINGDEMO',
      'assets',
      'parking-garage-hero.jpg',
    ),
  ].filter(Boolean)

  for (const source of sources) {
    if (copyFrom(source)) {
      const size = fs.statSync(dest).size
      console.log(
        `[auth-hero] Copied ${path.basename(source)} (${size} bytes) → public/auth/`,
      )
      return { ok: true, dest, copied: true, size, source }
    }
  }

  console.warn(
    '[auth-hero] Missing public/auth/parking-garage-hero.jpg — run scripts/copy-auth-assets.ps1 or place the JPG in public/auth/',
  )
  return { ok: false, dest, copied: false }
}

const isCli =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isCli) {
  ensureAuthHeroAsset()
  process.exit(0)
}
