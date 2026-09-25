// Generates build/icon.ico + build/icon.png from Renvor's real logo mark
// (scripts/assets/renvor-logo-source.jpg - a black "R" mark on white, with
// a lot of white padding around it). Run with `electron scripts/generate-icon.js`
// (a real Electron launch, not ELECTRON_RUN_AS_NODE - needs an actual
// renderer to use the Canvas API for auto-cropping).
//
// Not part of the normal build - the app itself never runs this. It exists
// so the icon can be regenerated later (e.g. a new source logo) without
// needing image-editing software.
const { app, BrowserWindow } = require('electron')
const { writeFileSync, mkdirSync, readFileSync } = require('fs')
const { join } = require('path')

const BUILD_DIR = join(__dirname, '..', 'build')
const SOURCE_LOGO = join(__dirname, 'assets', 'renvor-logo-source.jpg')
const MASTER = 512

function pageHtml(sourceDataUrl, size) {
  return `<!DOCTYPE html>
<html><head><style>html,body{margin:0;padding:0;}</style></head>
<body>
  <canvas id="out" width="${size}" height="${size}"></canvas>
  <script>
    const img = new Image();
    img.onload = () => {
      // 1. Draw the source at natural size to find the black mark's bounding box.
      const src = document.createElement('canvas');
      src.width = img.naturalWidth;
      src.height = img.naturalHeight;
      const sctx = src.getContext('2d');
      sctx.drawImage(img, 0, 0);
      const { data } = sctx.getImageData(0, 0, src.width, src.height);

      let minX = src.width, minY = src.height, maxX = 0, maxY = 0;
      for (let y = 0; y < src.height; y++) {
        for (let x = 0; x < src.width; x++) {
          const i = (y * src.width + x) * 4;
          const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
          if (r < 245 || g < 245 || b < 245) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }
      const boxW = maxX - minX;
      const boxH = maxY - minY;

      // 2. Composite the cropped mark, centered with padding, onto a white square.
      const out = document.getElementById('out');
      const octx = out.getContext('2d');
      octx.fillStyle = '#FFFFFF';
      octx.fillRect(0, 0, ${size}, ${size});

      const padded = Math.max(boxW, boxH) * 1.32;
      const scale = ${size} / padded;
      const drawW = boxW * scale;
      const drawH = boxH * scale;
      const dx = (${size} - drawW) / 2;
      const dy = (${size} - drawH) / 2;
      octx.drawImage(img, minX, minY, boxW, boxH, dx, dy, drawW, drawH);

      document.title = 'ready';
    };
    img.src = ${JSON.stringify(sourceDataUrl)};
  </script>
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
    entry.writeUInt8(size >= 256 ? 0 : size, 0)
    entry.writeUInt8(size >= 256 ? 0 : size, 1)
    entry.writeUInt8(0, 2)
    entry.writeUInt8(0, 3)
    entry.writeUInt16LE(1, 4)
    entry.writeUInt16LE(32, 6)
    entry.writeUInt32LE(png.length, 8)
    entry.writeUInt32LE(offset, 12)
    dirEntries.push(entry)
    imageBuffers.push(png)
    offset += png.length
  }

  return Buffer.concat([header, ...dirEntries, ...imageBuffers])
}

app.whenReady().then(async () => {
  mkdirSync(BUILD_DIR, { recursive: true })

  const sourceBuf = readFileSync(SOURCE_LOGO)
  const sourceDataUrl = `data:image/jpeg;base64,${sourceBuf.toString('base64')}`

  const win = new BrowserWindow({
    width: MASTER,
    height: MASTER,
    useContentSize: true,
    frame: false,
    show: false
  })
  await win.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(pageHtml(sourceDataUrl, MASTER))}`)

  // Wait for the in-page <script> to finish cropping/compositing (sets document.title = 'ready').
  await win.webContents.executeJavaScript(`
    new Promise((resolve) => {
      if (document.title === 'ready') return resolve();
      const check = setInterval(() => {
        if (document.title === 'ready') { clearInterval(check); resolve(); }
      }, 30);
    })
  `)

  let masterImage = await win.capturePage()
  const { width, height } = masterImage.getSize()
  if (width !== MASTER || height !== MASTER) {
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
