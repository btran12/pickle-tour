import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Generates the PickleBracket app icons (PNG) without any image dependency.
 * Run with: node scripts/generate-icons.mjs
 *
 * Design: rounded blue→violet tile, a tilted white pickleball paddle and a
 * lime ball, matching the app's palette.
 */

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons')

// ─── Geometry helpers (unit space, centre 0,0, edges ±0.5) ───────────

const clamp = (v, a, b) => Math.min(b, Math.max(a, v))

function sdRoundRect(px, py, cx, cy, hw, hh, r) {
  const qx = Math.abs(px - cx) - hw + r
  const qy = Math.abs(py - cy) - hh + r
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r
}

function sdCircle(px, py, cx, cy, r) {
  return Math.hypot(px - cx, py - cy) - r
}

function sdCapsule(px, py, ax, ay, bx, by, r) {
  const abx = bx - ax
  const aby = by - ay
  const t = clamp(((px - ax) * abx + (py - ay) * aby) / (abx * abx + aby * aby), 0, 1)
  return Math.hypot(px - (ax + abx * t), py - (ay + aby * t)) - r
}

function rotate(px, py, angle) {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  return [px * c - py * s, px * s + py * c]
}

// ─── Palette ─────────────────────────────────────────────────────────

const BG_FROM = [29, 78, 216]     // #1d4ed8
const BG_TO = [109, 40, 217]      // #6d28d9
const PADDLE = [248, 250, 252]    // #f8fafc
const BALL = [190, 242, 100]      // #bef264
const SHADOW = [15, 23, 42]       // #0f172a
const HOLE = [30, 64, 175]        // #1e40af

const lerp = (a, b, t) => a + (b - a) * t

/** Returns straight RGBA (0-255) for a unit-space point. */
function sample(u, v, maskable) {
  // Background tile
  const bgEdge = maskable ? -1 : sdRoundRect(u, v, 0, 0, 0.5, 0.5, 0.235)
  if (bgEdge > 0) return [0, 0, 0, 0]

  const t = clamp((u + v + 1) / 2, 0, 1)
  let r = lerp(BG_FROM[0], BG_TO[0], t)
  let g = lerp(BG_FROM[1], BG_TO[1], t)
  let b = lerp(BG_FROM[2], BG_TO[2], t)
  let a = 255

  // Content is scaled down inside the maskable safe zone
  const scale = maskable ? 0.74 : 1
  const x = u / scale
  const y = v / scale

  const angle = (35 * Math.PI) / 180
  const [lx, ly] = rotate(x, y, -angle)

  // Paddle: round head + handle, tilted
  const head = sdRoundRect(lx, ly, 0, -0.12, 0.195, 0.23, 0.145)
  const handle = sdCapsule(lx, ly, 0, 0.04, 0, 0.315, 0.056)
  const paddle = Math.min(head, handle)

  // Soft drop shadow
  const [sx, sy] = rotate(x - 0.016, y - 0.03, -angle)
  const shadow = Math.min(
    sdRoundRect(sx, sy, 0, -0.12, 0.195, 0.23, 0.145),
    sdCapsule(sx, sy, 0, 0.04, 0, 0.315, 0.056),
  )
  if (shadow <= 0) {
    const sa = 0.22
    r = lerp(r, SHADOW[0], sa)
    g = lerp(g, SHADOW[1], sa)
    b = lerp(b, SHADOW[2], sa)
  }

  if (paddle <= 0) {
    // Subtle vertical sheen on the paddle
    const shine = clamp(0.10 * (0.5 - ly), 0, 0.06)
    r = lerp(PADDLE[0], 255, shine)
    g = lerp(PADDLE[1], 255, shine)
    b = lerp(PADDLE[2], 255, shine)
  }

  // Ball in the top-right corner, ringed so it reads at small sizes
  const bx = 0.285
  const by = -0.285
  const ballR = 0.086
  const ball = sdCircle(x, y, bx, by, ballR)
  const ring = sdCircle(x, y, bx, by, ballR + 0.016)
  if (ring <= 0) {
    r = HOLE[0]; g = HOLE[1]; b = HOLE[2]
  }
  if (ball <= 0) {
    r = BALL[0]; g = BALL[1]; b = BALL[2]
    const holes = [
      [bx, by],
      [bx + 0.034, by + 0.028],
      [bx - 0.031, by + 0.035],
    ]
    for (const [hx, hy] of holes) {
      if (sdCircle(x, y, hx, hy, 0.0125) <= 0) {
        r = HOLE[0]; g = HOLE[1]; b = HOLE[2]
        break
      }
    }
  }

  return [r, g, b, a]
}

function render(size, { maskable = false, ss = 4 } = {}) {
  const H = size * ss
  const hi = new Uint8Array(H * H * 4)

  for (let j = 0; j < H; j++) {
    const v = (j + 0.5) / H - 0.5
    for (let i = 0; i < H; i++) {
      const u = (i + 0.5) / H - 0.5
      const [r, g, b, a] = sample(u, v, maskable)
      const o = (j * H + i) * 4
      hi[o] = r; hi[o + 1] = g; hi[o + 2] = b; hi[o + 3] = a
    }
  }

  // Box-filter down to the requested size (premultiplied for clean edges)
  const out = Buffer.alloc(size * size * 4)
  const n = ss * ss
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0
      for (let dy = 0; dy < ss; dy++) {
        for (let dx = 0; dx < ss; dx++) {
          const o = ((y * ss + dy) * H + (x * ss + dx)) * 4
          const al = hi[o + 3] / 255
          r += hi[o] * al
          g += hi[o + 1] * al
          b += hi[o + 2] * al
          a += al
        }
      }
      const o = (y * size + x) * 4
      if (a > 0) {
        out[o] = Math.round(r / a)
        out[o + 1] = Math.round(g / a)
        out[o + 2] = Math.round(b / a)
      }
      out[o + 3] = Math.round((a / n) * 255)
    }
  }
  return out
}

// ─── PNG encoder ─────────────────────────────────────────────────────

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

function crc32(buf) {
  let c = 0xffffffff
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crc])
}

function encodePNG(width, height, rgba) {
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0 // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8  // bit depth
  ihdr[9] = 6  // colour type: RGBA
  ihdr[10] = 0 // deflate
  ihdr[11] = 0 // adaptive filtering
  ihdr[12] = 0 // no interlace
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

// ─── Emit icons ──────────────────────────────────────────────────────

mkdirSync(OUT_DIR, { recursive: true })

const targets = [
  { name: 'icon-192.png', size: 192, maskable: false },
  { name: 'icon-512.png', size: 512, maskable: false },
  { name: 'maskable-192.png', size: 192, maskable: true },
  { name: 'maskable-512.png', size: 512, maskable: true },
  { name: 'apple-touch-icon.png', size: 180, maskable: true },
  { name: 'favicon-32.png', size: 32, maskable: false, ss: 8 },
]

for (const { name, size, maskable, ss } of targets) {
  const rgba = render(size, { maskable, ss: ss ?? 4 })
  writeFileSync(join(OUT_DIR, name), encodePNG(size, size, rgba))
  console.log(`✓ ${name}`)
}
