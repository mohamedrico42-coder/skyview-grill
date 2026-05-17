// Extract each page of the menu PDFs to JPG.
// Outputs:  public/menu-images/food/food-{n}.jpg
//           public/menu-images/drinks/drink-{n}.jpg
//           public/menu-images/manifest.json
//
// Usage:  node extractMenuImages.js
//
// No system dependencies required. Uses pdf-to-img (pure JS) + sharp (prebuilt binary).

import { pdf } from 'pdf-to-img'
import sharp from 'sharp'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const SOURCES = [
  { pdf: 'public/food menu.pdf',  outDir: 'public/menu-images/food',   prefix: 'food',  label: 'Food'   },
  { pdf: 'public/drink menu.pdf', outDir: 'public/menu-images/drinks', prefix: 'drink', label: 'Drinks' },
]

const RENDER_SCALE = 2.0   // crisp text/graphics; ~1400-1700px wide for letter pages
const JPG_QUALITY = 82
const MAX_WIDTH = 1600     // final downscale ceiling

const ensureDir = (p) => fs.mkdir(p, { recursive: true })

const wipeJpgs = async (dir) => {
  const files = await fs.readdir(dir).catch(() => [])
  await Promise.all(
    files
      .filter((f) => /\.(jpe?g|png)$/i.test(f))
      .map((f) => fs.unlink(path.join(dir, f))),
  )
}

const padNum = (n, width) => String(n).padStart(width, '0')

const extract = async ({ pdf: src, outDir, prefix, label }) => {
  const absPdf = path.join(__dirname, src)
  const absOut = path.join(__dirname, outDir)

  try { await fs.access(absPdf) }
  catch { console.warn(`[skip] ${src} not found.`); return { label, prefix, pages: [] } }

  await ensureDir(absOut)
  await wipeJpgs(absOut)

  console.log(`\n→ Extracting ${src}`)
  console.log(`  output: ${outDir}/`)

  const document = await pdf(absPdf, { scale: RENDER_SCALE })
  const pages = []
  const t0 = Date.now()
  let i = 0
  for await (const pngBuffer of document) {
    i += 1
    const padded = padNum(i, 2)
    const file = `${prefix}-${padded}.jpg`
    const absFile = path.join(absOut, file)
    await sharp(pngBuffer)
      .resize({ width: MAX_WIDTH, withoutEnlargement: true, fit: 'inside' })
      .jpeg({ quality: JPG_QUALITY, mozjpeg: true })
      .toFile(absFile)
    const stat = await fs.stat(absFile)
    const kb = (stat.size / 1024).toFixed(0)
    pages.push(`/${path.relative('public', path.join(outDir, file)).split(path.sep).join('/')}`)
    process.stdout.write(`  ✓ ${file}  (${kb} KB)\n`)
  }
  console.log(`  done in ${((Date.now() - t0) / 1000).toFixed(1)}s — ${pages.length} pages`)
  return { label, prefix, pages }
}

const main = async () => {
  await ensureDir(path.join(__dirname, 'public/menu-images'))

  const out = {}
  for (const src of SOURCES) {
    const { label, pages } = await extract(src)
    out[src.prefix === 'food' ? 'food' : 'drinks'] = { label, pages }
  }

  const manifestPath = path.join(__dirname, 'public/menu-images/manifest.json')
  await fs.writeFile(manifestPath, JSON.stringify(out, null, 2))
  console.log(`\n📒 Manifest written: public/menu-images/manifest.json`)
  console.log(
    JSON.stringify(out, (k, v) => (Array.isArray(v) ? `${v.length} pages` : v), 2),
  )
}

main().catch((err) => {
  console.error('\n❌ Extraction failed:', err?.message || err)
  process.exit(1)
})
