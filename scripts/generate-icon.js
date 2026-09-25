// One-time generator for build/icon.ico + build/icon.png. Run with
// `electron scripts/generate-icon.js` (a real Electron launch, not
// ELECTRON_RUN_AS_NODE - this needs an actual renderer to draw into).
//
// Not part of the normal build - the app itself never runs this. It exists
// so the icon can be regenerated later (e.g. if the glyph/colors change)
// without needing image-editing software: everything here is generated
// from the ClipboardCheck path data already shipped in the lucide-react
// dependency, plus the app's own default brand colors from
// settingsSchema (see src/shared/ipc-contract.ts) - no external assets.
const { app, BrowserWindow } = require('electron')
const { writeFileSync, mkdirSync } = require('fs')
const { join } = require('path')

const BUILD_DIR = join(__dirname, '..', 'build')
const BG = '#0B0E12' // app canvas background
const FG = '#FF8A24' // settingsSchema.brandPrimaryColor default

// Lucide "ClipboardCheck" path data (ISC license, from node_modules/lucide-react).
const GLYPH_SVG = `
  <rect width="8" height="4" x="8" y="2" rx="1" ry="1"></rect>
  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
  <path d="m9 14 2 2 4-4"></path>
`

function iconHtml(sizePx) {
  const corner = Math.round(sizePx * 0.22)
  const glyphSize = Math.round(sizePx * 0.62)
  // stroke-width stays in the glyph's native 24-unit coordinate space - the
  // group's scale() transform below scales it visually along with the path
  // geometry, so it must NOT be pre-multiplied by the scale factor too.
  return `<!DOCTYPE html>
<html><head><style>
  html,body{margin:0;padding:0;background:transparent;}
</style></head>
<body>
  <svg width="${sizePx}" height="${sizePx}" viewBox="0 0 ${sizePx} ${sizePx}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${sizePx}" height="${sizePx}" rx="${corner}" fill="${BG}"/>
    <g transform="translate(${(sizePx - glyphSize) / 2}, ${(sizePx - glyphSize) / 2}) scale(${glyphSize / 24})"
       fill="none" stroke="${FG}" stroke-width="2.4"
       stroke-linecap="round" stroke-linejoin="round">
      ${GLYPH_SVG}
    </g>
  </svg>
</body></html>`
}

/** ICO container holding PNG-encoded images (supported since Windows Vista). */
function buildIco(pngsBySize) {
  const sizes = Object.keys(pngsBySize).map(Number).sort((a, b) => a - b)
  const count = sizes.length
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0) // reserved
  header.writeUInt16LE(1, 2) // type: icon
  header.writeUInt16LE(count, 4)

  const dirEntries = []
  const imageBuffers = []
  let offset = 6 + count * 16

  for (const size of sizes) {
    const png = pngsBySize[size]
    const entry = Buffer.alloc(16)
    entry.writeUInt8(size >= 256 ? 0 : size, 0) // width (0 = 256)
    entry.writeUInt8(size >= 256 ? 0 : size, 1) // height (0 = 256)
    entry.writeUInt8(0, 2) // color palette
    entry.writeUInt8(0, 3) // reserved
    entry.writeUInt16LE(1, 4) // color planes
    entry.writeUInt16LE(32, 6) // bits per pixel
    entry.writeUInt32LE(png.length, 8) // size of image data
    entry.writeUInt32LE(offset, 12) // offset of image data
    dirEntries.push(entry)
    imageBuffers.push(png)
    offset += png.length
  }

  return Buffer.concat([header, ...dirEntries, ...imageBuffers])
}

app.whenReady().then(async () => {
  mkdirSync(BUILD_DIR, { recursive: true })

  const MASTER = 256
  const win = new BrowserWindow({
    width: MASTER,
    height: MASTER,
    useContentSize: true,
    frame: false,
    show: false
  })
  await win.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(iconHtml(MASTER))}`)
  await new Promise((r) => setTimeout(r, 150)) // let the SVG paint

  let masterImage = await win.capturePage()
  const { width, height } = masterImage.getSize()
  if (width !== MASTER || height !== MASTER) {
    // Different DPI scaling can still shift the captured pixel size from
    // the logical window size - normalize back to a clean square master.
    masterImage = masterImage.resize({ width: MASTER, height: MASTER, quality: 'best' })
  }
  writeFileSync(join(BUILD_DIR, 'icon.png'), masterImage.toPNG())

  const icoSizes = [16, 24, 32, 48, 64, 128, 256]
  const pngsBySize = {}
  for (const size of icoSizes) {
    const resized = masterImage.resize({ width: size, height: size, quality: 'best' })
    pngsBySize[size] = resized.toPNG()
  }
  writeFileSync(join(BUILD_DIR, 'icon.ico'), buildIco(pngsBySize))

  console.log('Wrote build/icon.png and build/icon.ico')
  win.destroy()
  app.exit(0)
})
