#!/usr/bin/env node
// WebSage icon generator — zero dependencies.
// Emits a PNG (IHDR/IDAT/IEND) per size using node:zlib for deflate and a
// hand-rolled CRC32. Motif: #4688F1 rounded square + white chat bubble with
// a tail pointing toward the bottom-right corner.
//
// Usage: node scripts/generate-icons.js   (run from repo root)
'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SIZES = [16, 32, 48, 128];
const OUT_DIR = path.join(__dirname, '..', 'icons');
const BLUE = [0x46, 0x88, 0xF1];
const WHITE = [0xFF, 0xFF, 0xFF];

// --- CRC32 (PNG chunk checksums) -------------------------------------------
const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePNG(size, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // Each scanline is prefixed with filter byte 0 (None).
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

// --- Shape tests (point-in-shape, per pixel) --------------------------------
function inRoundedRect(x, y, size) {
  const r = size / 4;
  const half = size / 2;
  const dx = Math.max(Math.abs(x - half) - (half - r), 0);
  const dy = Math.max(Math.abs(y - half) - (half - r), 0);
  return dx * dx + dy * dy <= r * r;
}

function inBubble(x, y, size) {
  const cx = 0.52 * size;
  const cy = 0.45 * size;
  const r = 0.28 * size;
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= r * r;
}

// Tail triangle: two points on the bubble's lower-left arc, one near the
// bottom-right corner of the square.
function inTail(x, y, size) {
  const ax = 0.36 * size, ay = 0.58 * size;
  const bx = 0.48 * size, by = 0.58 * size;
  const cx = 0.74 * size, cy = 0.90 * size;
  const s1 = (bx - ax) * (y - ay) - (by - ay) * (x - ax);
  const s2 = (cx - bx) * (y - by) - (cy - by) * (x - bx);
  const s3 = (ax - cx) * (y - cy) - (ay - cy) * (x - cx);
  const hasNeg = s1 < 0 || s2 < 0 || s3 < 0;
  const hasPos = s1 > 0 || s2 > 0 || s3 > 0;
  return !(hasNeg && hasPos);
}

function rasterize(size) {
  const rgba = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      if (!inRoundedRect(x + 0.5, y + 0.5, size)) {
        rgba[i + 3] = 0; // transparent
        continue;
      }
      const [r, g, b] = inBubble(x + 0.5, y + 0.5, size) || inTail(x + 0.5, y + 0.5, size)
        ? WHITE : BLUE;
      rgba[i] = r;
      rgba[i + 1] = g;
      rgba[i + 2] = b;
      rgba[i + 3] = 255;
    }
  }
  return rgba;
}

// --- Self-check --------------------------------------------------------------
function checkPNG(file, size) {
  const buf = fs.readFileSync(file);
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (!buf.subarray(0, 8).equals(sig)) throw new Error(`${file}: bad PNG signature`);
  if (buf.length <= 8 + 25 + 12) throw new Error(`${file}: file too small`);
  if (buf.readUInt32BE(16) !== size) throw new Error(`${file}: width mismatch`);
  if (buf.readUInt32BE(20) !== size) throw new Error(`${file}: height mismatch`);
  if (buf[24] !== 8 || buf[25] !== 6) throw new Error(`${file}: unexpected bit depth / color type`);
}

// --- Main ---------------------------------------------------------------------
fs.mkdirSync(OUT_DIR, { recursive: true });
for (const size of SIZES) {
  const file = path.join(OUT_DIR, `icon${size}.png`);
  const png = encodePNG(size, rasterize(size));
  fs.writeFileSync(file, png);
  checkPNG(file, size);
  console.log(`Created icons/icon${size}.png (${size}x${size}, ${png.length} bytes)`);
}
console.log('All icons generated and self-checked.');
