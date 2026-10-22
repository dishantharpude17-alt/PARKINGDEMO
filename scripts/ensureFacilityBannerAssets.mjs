import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.join(__dirname, '..')
const destDir = path.join(projectRoot, 'public', 'facility-banners')

const BANNER_FILES = [
  'shopping-mall.jpg',
  'railway-station.jpg',
  'parking-facility.jpg',
]

function cursorAssetsDir() {
  return path.join(
    os.homedir(),
    '.cursor',
    'projects',
    'c-Users-Admin-Desktop-PARKINGDEMO',
    'assets',
  )
}

function sourceDirs() {
  return [
    process.env.PARKINGDEMO_FACILITY_BANNERS_SOURCE,
    path.join(projectRoot, 'assets'),
    cursorAssetsDir(),
  ].filter(Boolean)
}

function ensureOne(fileName) {
  const dest = path.join(destDir, fileName)
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0) {
    return { fileName, ok: true, copied: false, size: fs.statSync(dest).size }
  }

  for (const dir of sourceDirs()) {
    const source = path.join(dir, fileName)
    if (!fs.existsSync(source)) {
      continue
    }
    fs.mkdirSync(destDir, { recursive: true })
    fs.copyFileSync(source, dest)
    const size = fs.statSync(dest).size
    console.log(
      `[facility-banners] Copied ${fileName} (${size} bytes) → public/facility-banners/`,
    )
    return { fileName, ok: true, copied: true, size, source }
  }

  console.warn(
    `[facility-banners] Missing ${fileName} — run scripts/copy-facility-banners.ps1`,
  )
  return { fileName, ok: false, copied: false }
}

/** @returns {{ ok: boolean; results: ReturnType<typeof ensureOne>[] }} */
export function ensureFacilityBannerAssets() {
  const results = BANNER_FILES.map((fileName) => ensureOne(fileName))
  return { ok: results.every((r) => r.ok), results }
}

const isCli =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isCli) {
  ensureFacilityBannerAssets()
  process.exit(0)
}
