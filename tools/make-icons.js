/* tools/make-icons.js — 生成 PWA PNG 图标（纯 Node，无依赖）
   运行：node tools/make-icons.js */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  if (!crc32.table) {
    crc32.table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      crc32.table[n] = c;
    }
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ crc32.table[(crc ^ buf[i]) & 0xff];
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePNG(width, height, pixelFn) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  let off = 0;
  for (let y = 0; y < height; y++) {
    raw[off++] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const px = pixelFn(x, y);
      raw[off++] = px[0]; raw[off++] = px[1]; raw[off++] = px[2]; raw[off++] = px[3];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type: RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// 渐变背景 + 白色圆 + 内部青色圆（数字球风格）
function draw(size) {
  const cx = size / 2, cy = size / 2;
  return function (x, y) {
    const dx = x - cx, dy = y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const t = (x + y) / (2 * size);
    let r = Math.round(108 - 80 * t);
    let g = Math.round(92 + 60 * t);
    let b = Math.round(231 - 30 * t);
    if (dist < size * 0.34) { r = 255; g = 255; b = 255; }
    if (dist < size * 0.20) { r = 0; g = 206; b = 201; }
    return [r, g, b, 255];
  };
}

const outDir = path.join(__dirname, '..', 'icons');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'icon-192.png'), encodePNG(192, 192, draw(192)));
fs.writeFileSync(path.join(outDir, 'icon-512.png'), encodePNG(512, 512, draw(512)));
console.log('icons generated: icon-192.png, icon-512.png');
