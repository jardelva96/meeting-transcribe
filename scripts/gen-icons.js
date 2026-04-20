// Generates extension icons: 16x16, 48x48, 128x128
// Design: dark bg (#0f0f1c) + indigo mic waveform (#6366f1)
import { Jimp } from 'jimp'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { mkdirSync } from 'fs'

const __dir = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(__dir, '../public/icons')
mkdirSync(OUT, { recursive: true })

const BG   = 0x0f0f1cff
const FG   = 0x6366f1ff
const FG2  = 0x818cf8ff

function lerp(a, b, t) { return a + (b - a) * t }

function drawRoundRect(img, x, y, w, h, r, color) {
  for (let py = y; py < y + h; py++) {
    for (let px = x; px < x + w; px++) {
      const dx = Math.max(x + r - px, 0, px - (x + w - 1 - r))
      const dy = Math.max(y + r - py, 0, py - (y + h - 1 - r))
      if (Math.sqrt(dx * dx + dy * dy) <= r + 0.5) {
        img.setPixelColor(color, px, py)
      }
    }
  }
}

function drawMic(img, size) {
  const cx = size / 2
  const bg_r = Math.round(size * 0.42)

  // Background circle
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const dx = px - cx + 0.5
      const dy = py - cx + 0.5
      if (Math.sqrt(dx * dx + dy * dy) <= bg_r) {
        img.setPixelColor(0x1e1e38ff, px, py)
      }
    }
  }

  if (size >= 48) {
    // Mic body (rounded rect)
    const mw  = Math.round(size * 0.18)
    const mh  = Math.round(size * 0.32)
    const mx  = Math.round(cx - mw / 2)
    const my  = Math.round(size * 0.18)
    const mr  = Math.round(mw * 0.5)
    drawRoundRect(img, mx, my, mw, mh, mr, FG)

    // Mic arc (bottom of body rounded)
    const arcR = Math.round(size * 0.22)
    const arcY = Math.round(size * 0.52)
    const arcThick = Math.max(2, Math.round(size * 0.05))
    for (let angle = 0; angle <= 180; angle++) {
      const rad = (angle * Math.PI) / 180
      for (let t = 0; t < arcThick; t++) {
        const r = arcR - t
        const px = Math.round(cx + r * Math.cos(Math.PI - rad))
        const py = Math.round(arcY - r * Math.sin(Math.PI - rad))
        if (px >= 0 && px < size && py >= 0 && py < size) {
          img.setPixelColor(FG2, px, py)
        }
      }
    }

    // Stand line (vertical)
    const lineW = Math.max(2, Math.round(size * 0.05))
    const lineX = Math.round(cx - lineW / 2)
    const lineY1 = Math.round(arcY)
    const lineY2 = Math.round(size * 0.72)
    drawRoundRect(img, lineX, lineY1, lineW, lineY2 - lineY1, 1, FG2)

    // Base line (horizontal)
    const baseW = Math.round(size * 0.3)
    const baseH = Math.max(2, Math.round(size * 0.05))
    const baseX = Math.round(cx - baseW / 2)
    drawRoundRect(img, baseX, lineY2, baseW, baseH, Math.floor(baseH / 2), FG2)
  } else {
    // 16x16: simplified — just a filled rounded rect mic body
    const mw = Math.round(size * 0.28)
    const mh = Math.round(size * 0.42)
    const mx = Math.round(cx - mw / 2)
    const my = Math.round(size * 0.12)
    drawRoundRect(img, mx, my, mw, mh, Math.round(mw * 0.5), FG)

    // Small base
    const bw = Math.round(size * 0.42)
    const bh = Math.max(1, Math.round(size * 0.08))
    drawRoundRect(img, Math.round(cx - bw / 2), Math.round(size * 0.72), bw, bh, 1, FG2)
  }
}

async function generate(size) {
  const img = new Jimp({ width: size, height: size, color: BG })
  drawMic(img, size)
  await img.write(resolve(OUT, `icon${size}.png`))
  console.log(`  icon${size}.png`)
}

console.log('Generating icons...')
await Promise.all([generate(16), generate(48), generate(128)])
console.log('Done.')
