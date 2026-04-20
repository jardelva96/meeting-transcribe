// Gerador de ícones PNG puro Node.js (sem dependências externas)
// Execute: node scripts/generate-icons.js

import { deflateSync } from 'zlib'
import { writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const outDir = resolve(__dir, '../public/icons')
mkdirSync(outDir, { recursive: true })

// CRC32 para PNG
const crcTable = (() => {
  const t = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[i] = c
  }
  return t
})()

function crc32(buf) {
  let crc = 0xffffffff
  for (const b of buf) crc = crcTable[(crc ^ b) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const tb = Buffer.from(type, 'ascii')
  const crcVal = Buffer.alloc(4)
  crcVal.writeUInt32BE(crc32(Buffer.concat([tb, data])))
  return Buffer.concat([len, tb, data, crcVal])
}

function makePNG(size, getPixel) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 2 // 8-bit RGB

  const rows = []
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 3)
    row[0] = 0 // filter: None
    for (let x = 0; x < size; x++) {
      const [r, g, b] = getPixel(x, y, size)
      row[1 + x * 3] = r
      row[2 + x * 3] = g
      row[3 + x * 3] = b
    }
    rows.push(row)
  }

  const idat = deflateSync(Buffer.concat(rows))
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))])
}

// Desenha o ícone: fundo escuro + círculo violeta + ponto branco no centro
function iconPixel(x, y, size) {
  const cx = size / 2, cy = size / 2
  const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
  const outer = size * 0.47
  const inner = size * 0.30
  const dot   = size * 0.12

  if (dist <= dot) return [255, 255, 255]            // ponto central branco
  if (dist <= inner) return [99, 102, 241]            // círculo violeta
  if (dist <= outer) return [99, 102, 241]            // anel
  if (dist <= outer + 1.5) return [60, 60, 100]      // borda suave
  return [8, 8, 16]                                   // fundo escuro
}

for (const size of [16, 48, 128]) {
  const buf = makePNG(size, iconPixel)
  writeFileSync(resolve(outDir, `icon${size}.png`), buf)
  console.log(`✓ icon${size}.png (${buf.length} bytes)`)
}

console.log('Ícones gerados em public/icons/')
