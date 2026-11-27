// Cuts the generated source art in design/source-art/ into app assets in public/.
// Run: node scripts/slice-art.mjs   (re-run after replacing any source sheet)
import sharp from "sharp";
import { copyFile, mkdir } from "node:fs/promises";

const SRC = "design/source-art";
const out = async (dir) => mkdir(dir, { recursive: true });

/** Bounding boxes of the opaque blobs in a transparent sheet (connected components on a downscaled alpha mask). */
async function blobs(file, { scale = 4, alphaMin = 24, minArea = 400, pad = 6 } = {}) {
  const img = sharp(file);
  const { width, height } = await img.metadata();
  const w = Math.ceil(width / scale), h = Math.ceil(height / scale);
  const { data } = await img.clone().ensureAlpha().extractChannel(3).resize(w, h, { kernel: "nearest" }).raw().toBuffer({ resolveWithObject: true });
  const seen = new Uint8Array(w * h);
  const boxes = [];
  for (let i = 0; i < w * h; i++) {
    if (seen[i] || data[i] < alphaMin) continue;
    let x0 = w, y0 = h, x1 = 0, y1 = 0, area = 0;
    const stack = [i];
    seen[i] = 1;
    while (stack.length) {
      const p = stack.pop();
      const x = p % w, y = (p / w) | 0;
      area++;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const q = ny * w + nx;
        if (!seen[q] && data[q] >= alphaMin) { seen[q] = 1; stack.push(q); }
      }
    }
    if (area >= minArea) {
      boxes.push({
        left: Math.max(0, x0 * scale - pad), top: Math.max(0, y0 * scale - pad),
        width: Math.min(width, (x1 + 1) * scale + pad) - Math.max(0, x0 * scale - pad),
        height: Math.min(height, (y1 + 1) * scale + pad) - Math.max(0, y0 * scale - pad),
      });
    }
  }
  // Reading order: rows (by vertical center, 1/6 of sheet height tolerance), then left to right.
  const band = height / 6;
  return boxes.sort((a, b) => Math.round((a.top + a.height / 2) / band) - Math.round((b.top + b.height / 2) / band) || a.left - b.left);
}

async function cutBlobs(file, names, dir, size, opts = {}) {
  await out(dir);
  let boxes = await blobs(file, opts);
  if (boxes.length !== names.length) console.warn(`${file}: found ${boxes.length} blobs, expected ${names.length}`);
  if (opts.centers) {
    // Name each blob by the nearest expected center (sheet pixels), for free-form layouts.
    const named = new Map();
    for (const box of boxes) {
      const cx = box.left + box.width / 2, cy = box.top + box.height / 2;
      let best = null, bestD = Infinity;
      for (const [name, [x, y]] of Object.entries(opts.centers)) {
        const d = (x - cx) ** 2 + (y - cy) ** 2;
        if (d < bestD && !named.has(name)) { bestD = d; best = name; }
      }
      named.set(best, box);
    }
    for (const [name, box] of named) await save(file, box, `${dir}/${name}.png`, size);
    return;
  }
  if (opts.row) {
    boxes = boxes.sort((a, b) => a.left - b.left);
    // Padding can reach a neighbour's glow: clip each box at the midpoint of the gap to the next one.
    const pad = opts.pad ?? 6;
    for (let i = 0; i < boxes.length - 1; i++) {
      const a = boxes[i], b = boxes[i + 1];
      const mid = Math.round((a.left + a.width - pad + b.left + pad) / 2);
      if (a.left + a.width > mid) a.width = mid - a.left;
      if (b.left < mid) { b.width -= mid - b.left; b.left = mid; }
    }
  }
  for (const [i, box] of boxes.entries()) await save(file, box, `${dir}/${names[i] ?? `extra-${i}`}.png`, size);
}

const save = (file, box, path, size) =>
  sharp(file).extract(box).resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(path);

// 1. Avatars: a regular 4x3 grid of circles. Cut cells, then mask to a circle so corners are transparent.
await out("public/avatars");
{
  const file = `${SRC}/avatars-grid.png`;
  const { width, height } = await sharp(file).metadata();
  const cw = width / 4, ch = height / 3, S = 256;
  const mask = Buffer.from(`<svg width="${S}" height="${S}"><circle cx="${S / 2}" cy="${S / 2}" r="${S / 2 - 1}" fill="#fff"/></svg>`);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
    const n = String(r * 4 + c + 1).padStart(2, "0");
    const inset = Math.round(cw * 0.035);
    await sharp(file)
      .extract({ left: Math.round(c * cw) + inset, top: Math.round(r * ch) + inset, width: Math.round(cw) - inset * 2, height: Math.round(ch) - inset * 2 })
      .resize(S, S).composite([{ input: mask, blend: "dest-in" }]).png().toFile(`public/avatars/look-${n}.png`);
  }
}

// 2. Pet states, 3. mascots: one row each, split by transparent gaps.
await cutBlobs(`${SRC}/wisp-states.png`, ["wisp-thriving", "wisp-okay", "wisp-hungry", "wisp-fading", "wisp-dead"], "public/mascots", 384, { minArea: 2000, row: true, pad: 48 });
await cutBlobs(`${SRC}/mascots.png`, ["pip", "bones", "planchette"], "public/mascots", 384, { minArea: 2000, row: true, pad: 48 });

// 4. UI kit: free layout; each blob is named by the nearest known center on the 2048x1536 sheet.
await cutBlobs(`${SRC}/ui-kit.png`, Array(13).fill(""), "public/ui", 512, {
  minArea: 600,
  centers: {
    "btn-primary": [460, 190], "btn-secondary": [1155, 195], "crystal-ball": [1710, 240],
    "pin-candle": [325, 530], "pin-bone": [790, 560], "wax-seal": [1275, 540],
    "tape-pumpkin": [540, 835], "tape-bone": [1470, 835], "red-string": [1000, 1040],
    "visitor-counter": [380, 1320], "toggle-on": [880, 1310], "toggle-off": [1185, 1310], "planchette-cursor": [1670, 1320],
  },
});

// 5. Wordmark: trim the empty margin.
await out("public/brand");
await sharp(`${SRC}/wordmark.png`).trim({ threshold: 1 }).png().toFile("public/brand/wordmark.png");
await sharp(`${SRC}/wordmark.png`).trim({ threshold: 1 }).resize({ height: 96 }).png().toFile("public/brand/wordmark-96.png");

// 6. Logo mark + app icon (vector) -> raster sizes the app already references.
await copyFile(`${SRC}/logo-mark.svg`, "public/brand/logo-mark.svg");
// The vector icon is a plum rounded tile on a cream square: trim the cream, then
//  - "any" icons: keep the tile shape, transparent corners
//  - maskable: full-bleed plum square (platforms apply their own mask)
const icon = `${SRC}/app-icon.svg`;
await out("public/icons");
const tile = await sharp(icon, { density: 300 }).resize(1024, 1024).flatten({ background: "#f3ead9" }).trim({ threshold: 20 }).resize(1024, 1024).png().toBuffer();
const round = Buffer.from(`<svg width="1024" height="1024"><rect width="1024" height="1024" rx="230" fill="#fff"/></svg>`);
const rounded = await sharp(tile).composite([{ input: round, blend: "dest-in" }]).png().toBuffer();
const PLUM = { r: 27, g: 18, b: 32, alpha: 1 };
const bleed = await sharp({ create: { width: 1024, height: 1024, channels: 4, background: PLUM } })
  .composite([{ input: await sharp(rounded).resize(1180, 1180).extract({ left: 78, top: 78, width: 1024, height: 1024 }).toBuffer() }]).png().toBuffer();
for (const [size, path, src] of [[64, "public/favicon.png", rounded], [180, "public/apple-touch-icon.png", bleed], [180, "public/icons/apple-touch-icon.png", bleed],
  [192, "public/icons/icon-192.png", rounded], [512, "public/icons/icon-512.png", rounded], [512, "public/icons/icon-512-maskable.png", bleed], [1024, "public/icons/icon-1024.png", rounded]]) {
  await sharp(src).resize(size, size).png().toFile(path);
}
await sharp(`${SRC}/logo-mark.svg`, { density: 300 }).resize(512, 512).png().toFile("public/brand/logo-mark-512.png");
console.log("done");

// 7. Social preview (1200x630): wordmark over the plum page with wisp.
{
  const W = 1200, H = 630;
  const word = await sharp("public/brand/wordmark.png").resize({ width: 760 }).toBuffer();
  const pet = await sharp("public/mascots/wisp-thriving.png").resize(260, 260).toBuffer();
  const glow = Buffer.from(`<svg width="${W}" height="${H}"><defs><radialGradient id="g" cx="50%" cy="55%" r="60%"><stop offset="0" stop-color="#3a2340"/><stop offset="1" stop-color="#1b1220"/></radialGradient></defs><rect width="${W}" height="${H}" fill="url(#g)"/></svg>`);
  await sharp(glow).composite([{ input: pet, left: 470, top: 40 }, { input: word, left: 220, top: 300 }]).png().toFile("public/brand/og.png");
  console.log("og done");
}
