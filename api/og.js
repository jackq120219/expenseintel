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
  const paper = [243, 240, 232, 255];
  const ink = [17, 20, 17, 255];
  const lime = [168, 255, 47, 255];
  const gray = [107, 112, 103, 255];
  const pale = [225, 222, 212, 255];

  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    rect(raw, width, 0, y, width, 1, paper);
  }

  // Identity rail.
  rect(raw, width, 0, 0, 94, height, ink);
  rect(raw, width, 0, 0, 8, height, lime);
  rect(raw, width, 24, 228, 44, 10, paper);
  rect(raw, width, 24, 228, 10, 76, paper);
  rect(raw, width, 24, 260, 35, 9, paper);
  rect(raw, width, 24, 294, 44, 10, paper);
  rect(raw, width, 72, 228, 9, 76, lime);

  // Editorial EI mark.
  rect(raw, width, 152, 154, 26, 196, ink);
  rect(raw, width, 152, 154, 230, 26, ink);
  rect(raw, width, 152, 238, 196, 22, ink);
  rect(raw, width, 152, 324, 230, 26, ink);
  rect(raw, width, 420, 154, 26, 196, lime);
  rect(raw, width, 152, 392, 294, 7, lime);

  // Decision Passport: eight lenses connected to one decision spine.
  rect(raw, width, 565, 106, 510, 418, ink);
  rect(raw, width, 566, 107, 508, 416, [22, 25, 20, 255]);
  rect(raw, width, 600, 140, 3, 345, gray);
  const ys = [154, 196, 238, 280, 322, 364, 406, 448];
  for (let i = 0; i < ys.length; i++) {
    const y = ys[i];
    rect(raw, width, 596, y, 11, 11, i === 0 ? lime : pale);
    line(raw, width, 607, y + 5, 650, y + 5, i === 0 ? lime : gray, 2);
    rect(raw, width, 660, y - 4, 138 + (i % 3) * 18, 18, i === 0 ? lime : [49, 54, 46, 255]);
    rect(raw, width, 824, y, 205 - (i % 2) * 34, 9, [82, 88, 78, 255]);
  }
  rect(raw, width, 660, 476, 365, 2, gray);
  rect(raw, width, 660, 494, 124, 12, lime);
  rect(raw, width, 796, 494, 229, 12, [66, 72, 63, 255]);

  // Small framing rules.
  rect(raw, width, 152, 472, 294, 2, ink);
  rect(raw, width, 152, 494, 112, 15, ink);
  rect(raw, width, 276, 494, 76, 15, gray);
  rect(raw, width, 364, 494, 82, 15, lime);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

module.exports = function handler(req, res) {
  const png = makePng();
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800');
  res.status(200).send(png);
};
