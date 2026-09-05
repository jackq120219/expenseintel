const zlib = require('zlib');

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const t = Buffer.from(type);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}

function setPixel(raw, width, x, y, r, g, b, a = 255) {
  if (x < 0 || y < 0 || x >= width) return;
  const row = y * (width * 4 + 1);
  const i = row + 1 + x * 4;
  if (i < 0 || i + 3 >= raw.length) return;
  raw[i] = r; raw[i + 1] = g; raw[i + 2] = b; raw[i + 3] = a;
}

function rect(raw, width, x, y, w, h, color) {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) setPixel(raw, width, xx, yy, ...color);
  }
}

function line(raw, width, x0, y0, x1, y1, color, thickness = 3) {
  let dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
  let dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  while (true) {
    rect(raw, width, x0 - Math.floor(thickness / 2), y0 - Math.floor(thickness / 2), thickness, thickness, color);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}

function makePng() {
  const width = 1200, height = 630;
  const raw = Buffer.alloc(height * (width * 4 + 1));
  const paper = [247, 244, 238, 255];
  const ink = [21, 21, 21, 255];
  const burgundy = [111, 41, 52, 255];
  const gray = [105, 98, 92, 255];

  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    rect(raw, width, 0, y, width, 1, paper);
  }

  rect(raw, width, 0, 0, 88, height, ink);
  rect(raw, width, 0, 0, 8, height, burgundy);

  // EI monogram in the dark rail.
  rect(raw, width, 23, 226, 42, 10, paper);
  rect(raw, width, 23, 226, 10, 74, paper);
  rect(raw, width, 23, 258, 34, 9, paper);
  rect(raw, width, 23, 290, 42, 10, paper);
  rect(raw, width, 68, 226, 9, 74, burgundy);

  // Large editorial mark: E and I built from geometric strokes.
  rect(raw, width, 160, 170, 28, 210, ink);
  rect(raw, width, 160, 170, 260, 28, ink);
  rect(raw, width, 160, 260, 220, 24, ink);
  rect(raw, width, 160, 352, 260, 28, ink);
  rect(raw, width, 458, 170, 28, 210, burgundy);

  // Cost / forecast graphic.
  line(raw, width, 620, 370, 720, 330, gray, 5);
  line(raw, width, 720, 330, 810, 350, gray, 5);
  line(raw, width, 810, 350, 900, 260, burgundy, 7);
  line(raw, width, 900, 260, 1010, 285, burgundy, 7);
  line(raw, width, 1010, 285, 1110, 205, burgundy, 7);
  rect(raw, width, 618, 368, 9, 9, gray);
  rect(raw, width, 716, 326, 9, 9, gray);
  rect(raw, width, 806, 346, 9, 9, gray);
  rect(raw, width, 896, 256, 11, 11, burgundy);
  rect(raw, width, 1006, 281, 11, 11, burgundy);
  rect(raw, width, 1106, 201, 11, 11, burgundy);

  // Bottom rule and small visual bars.
  rect(raw, width, 160, 462, 950, 2, ink);
  rect(raw, width, 160, 500, 170, 22, burgundy);
  rect(raw, width, 350, 500, 120, 22, ink);
  rect(raw, width, 490, 500, 220, 22, gray);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  return png;
}

module.exports = function handler(req, res) {
  const png = makePng();
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800, immutable');
  res.status(200).send(png);
};
