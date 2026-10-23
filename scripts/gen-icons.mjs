/**
 * Gera os ícones PNG do PWA (public/icon-192.png, icon-512.png,
 * icon-maskable-512.png e apple-touch-icon.png) replicando o desenho de
 * public/icon.svg, sem dependências externas (encoder PNG próprio via zlib).
 * Uso: node scripts/gen-icons.mjs
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const BG = [0x0f, 0x17, 0x2a, 255]; // #0f172a
const FG = [0x38, 0xbd, 0xf8, 255]; // #38bdf8
const SS = 4; // supersampling (antialiasing)

// glyph "L | |" de icon.svg (viewBox 128)
const POLYS = [
  [
    [34, 86],
    [34, 42],
    [44, 42],
    [44, 76],
    [62, 76],
    [62, 86],
  ],
  [
    [74, 86],
    [74, 52],
    [84, 52],
    [84, 86],
  ],
  [
    [94, 86],
    [94, 42],
    [104, 42],
    [104, 86],
  ],
];

function inPoly(x, y, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function inRoundRect(x, y, w, h, r) {
  if (x < 0 || y < 0 || x >= w || y >= h) return false;
  const cx = Math.min(Math.max(x, r), w - r);
  const cy = Math.min(Math.max(y, r), h - r);
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= r * r;
}

function rasterize(size, { radius }) {
  const buf = Buffer.alloc(size * size * 4);
  const scale = 128 / size;
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const x = px + (sx + 0.5) / SS;
          const y = py + (sy + 0.5) / SS;
          const vx = x * scale;
          const vy = y * scale;
          let c = null;
          if (inRoundRect(x, y, size, size, radius)) {
            const glyph = POLYS.some((p) => inPoly(vx, vy, p));
            c = glyph ? FG : BG;
          }
          if (c) {
            r += c[0];
            g += c[1];
            b += c[2];
            a += c[3];
          }
        }
      }
      const n = SS * SS;
      const o = (py * size + px) * 4;
      buf[o] = Math.round(r / n);
      buf[o + 1] = Math.round(g / n);
      buf[o + 2] = Math.round(b / n);
      buf[o + 3] = Math.round(a / n);
    }
  }
  return buf;
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const outDir = fileURLToPath(new URL('../apps/web/public/', import.meta.url));
mkdirSync(outDir, { recursive: true });

const rounded = (size) => [
  `${size === 192 ? 'icon-192' : 'icon-512'}.png`,
  size,
  { radius: Math.round(size * (28 / 128)) },
];
const outputs = [
  rounded(192),
  rounded(512),
  ['icon-maskable-512.png', 512, { radius: 0 }], // maskable: fundo full-bleed, glyph dentro da safe zone
  ['apple-touch-icon.png', 180, { radius: 0 }], // iOS: opaco, sem raio
];

for (const [name, size, opts] of outputs) {
  writeFileSync(`${outDir}${name}`, encodePng(size, rasterize(size, opts)));
  console.log(`ok ${name} (${size}x${size})`);
}
