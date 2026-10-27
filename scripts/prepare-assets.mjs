// Script that organizes the original reference images (2026글로벌해커톤) into the app's paths/names
// - Character sheets & place icons: flood fill from the edges to make the solid background (gray/white) transparent
// - Classroom backgrounds: copied as-is (only size-optimized)
import sharp from 'sharp';
import { copyFileSync, mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';

// The original reference material lives in the project's parent folder (2026글로벌해커톤)
const SRC = path.resolve('..');
const OUT = path.resolve('public/assets');

// Gray shadow under the characters' feet (attached to the original gray background) → replaced by a soft shadow in the app
const CHAR_SHADOW = { minLum: 52, maxLum: 106, maxSat: 16, yMin: 0.752 }; // Only below the trouser hem (≈0.745): keeps gray trousers intact
// Light-gray shadow under white-background icons → removed because it shows up as a white smudge on the dark wheel
const ICON_SHADOW = { minLum: 150, maxLum: 256, maxSat: 14, yMin: 0 };

const jobs = [
  // [source, output, remove background, transparency threshold (near), partial-transparency threshold (far), erase classroom dummies, remove floor shadow]
  // Floor shadow: achromatic pixels connected to the background with brightness in [min, max] and below image-height ratio yMin
  ['캐릭터/2.민경.png', 'characters/char-ponytail.png', true, 22, 44, null, CHAR_SHADOW],
  ['캐릭터/1.김다현.png', 'characters/char-bob.png', true, 22, 44, null, CHAR_SHADOW],
  ['캐릭터/3.niersora.png', 'characters/char-wavy.png', true, 22, 44, null, CHAR_SHADOW],
  ['캐릭터/4. Nazan.png', 'characters/char-curly-glasses.png', true, 22, 44, null, CHAR_SHADOW],
  // Classroom background: erase the white placeholder dummies at character seats → head circle, body rect, offset of floor to copy over
  ['classroom/image 22.png', 'places/classroom-topdown.png', false, 0, 0, { head: [477, 1037, 46], body: [428, 1050, 528, 1130], from: [0, 150] }],
  ['classroom/image 17.png', 'places/classroom-backview.png', false, 0, 0, { head: [476, 1024, 74], body: [394, 1028, 556, 1196], from: [0, 250] }],
  ['아이콘/image 29.png', 'places/icon-classroom.png', true, 20, 40],
  ['아이콘/image 23.png', 'places/icon-my-room.png', true, 10, 22, null, ICON_SHADOW],
  ['아이콘/image 24.png', 'places/icon-library.png', true, 10, 22, null, ICON_SHADOW],
  ['아이콘/image 28.png', 'places/icon-museum.png', true, 20, 40],
  ['아이콘/image 31.png', 'places/icon-cafe.png', true, 10, 22, null, ICON_SHADOW],
];

// Only erases background-colored pixels connected to the edge, so similar colors inside the character survive
function removeBackground(data, w, h, near, far, shadow) {
  const px = (i) => [data[i * 4], data[i * 4 + 1], data[i * 4 + 2]];
  // Use the average of the four corners as the background color
  const corners = [0, w - 1, (h - 1) * w, h * w - 1].map(px);
  const bg = [0, 1, 2].map((c) => corners.reduce((s, p) => s + p[c], 0) / 4);
  const dist = (i) => {
    const [r, g, b] = px(i);
    return Math.hypot(r - bg[0], g - bg[1], b - bg[2]);
  };
  const seen = new Uint8Array(w * h);
  const stack = [];
  for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1);
  while (stack.length) {
    const i = stack.pop();
    if (seen[i]) continue;
    seen[i] = 1;
    let d = dist(i);
    if (shadow) {
      const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
      const lum = (r + g + b) / 3;
      // Treat achromatic shadow pixels like background (fully transparent + keep spreading)
      if (Math.max(r, g, b) - Math.min(r, g, b) <= shadow.maxSat && lum >= shadow.minLum && lum < shadow.maxLum && i / w >= shadow.yMin * h) d = 0;
    }
    if (d > far) continue;
    // At or below near is fully transparent; between near and far the edge is softened
    const a = d <= near ? 0 : Math.round(((d - near) / (far - near)) * 255);
    data[i * 4 + 3] = Math.min(data[i * 4 + 3], a);
    if (d > near) continue; // Don't spread further from edge pixels
    const x = i % w;
    if (x > 0) stack.push(i - 1);
    if (x < w - 1) stack.push(i + 1);
    if (i >= w) stack.push(i - w);
    if (i < w * (h - 1)) stack.push(i + w);
  }
}

// Build a mask of the placeholder dummy shape (head circle + rounded body rect),
// copy a floor patch from lower down the same aisle over it, then blend the edges softly
function erasePlaceholder(data, w, { head, body, from }) {
  const [hx, hy, hr] = head;
  const [bx0, by0, bx1, by1] = body;
  const x0 = Math.min(hx - hr, bx0) - 20, x1 = Math.max(hx + hr, bx1) + 20;
  const y0 = Math.min(hy - hr, by0) - 20, y1 = Math.max(hy + hr, by1) + 20;
  const bw = x1 - x0, bh = y1 - y0;
  const hard = new Float32Array(bw * bh);
  for (let y = 0; y < bh; y++)
    for (let x = 0; x < bw; x++) {
      const X = x + x0, Y = y + y0;
      const inHead = (X - hx) ** 2 + (Y - hy) ** 2 <= hr * hr;
      const inBody = X >= bx0 && X <= bx1 && Y >= by0 && Y <= by1;
      hard[y * bw + x] = inHead || inBody ? 1 : 0;
    }
  // Soft alpha via box blur (radius 9)
  const R = 9, soft = new Float32Array(bw * bh);
  for (let y = 0; y < bh; y++)
    for (let x = 0; x < bw; x++) {
      let sum = 0, n = 0;
      for (let dy = -R; dy <= R; dy++)
        for (let dx = -R; dx <= R; dx++) {
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= bw || yy >= bh) continue;
          sum += hard[yy * bw + xx]; n++;
        }
      // Weighted so the dummy's outline is fully covered
      soft[y * bw + x] = Math.min(1, (sum / n) * 1.8);
    }
  const [dx, dy] = from;
  for (let y = 0; y < bh; y++)
    for (let x = 0; x < bw; x++) {
      const a = soft[y * bw + x];
      if (!a) continue;
      const i = ((y + y0) * w + x + x0) * 4;
      const j = ((y + y0 + dy) * w + x + x0 + dx) * 4;
      for (let c = 0; c < 3; c++) data[i + c] = Math.round(data[i + c] * (1 - a) + data[j + c] * a);
    }
}

// In the original sheet, hair sometimes crosses the frame boundary (e.g. curly front view),
// so split into 4 at the emptiest column near each boundary, then re-center each figure in a wider frame (CELL_W)
const CELL_W = 400;
function reslice(data, w, h) {
  const occ = new Array(w).fill(0);
  for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) if (data[(y * w + x) * 4 + 3] > 40) occ[x]++;
  const cuts = [0];
  for (let k = 1; k < 4; k++) {
    const b = Math.round((w * k) / 4);
    let best = b;
    for (let x = b - 45; x <= b + 45; x++) if (occ[x] < occ[best]) best = x;
    cuts.push(best);
  }
  cuts.push(w);
  const out = Buffer.alloc(CELL_W * 4 * h * 4);
  for (let k = 0; k < 4; k++) {
    let l = cuts[k], r = cuts[k + 1];
    while (l < r && !occ[l]) l++;
    while (r > l && !occ[r - 1]) r--;
    const off = k * CELL_W + Math.round((CELL_W - (r - l)) / 2) - l;
    for (let y = 0; y < h; y++)
      for (let x = l; x < r; x++) {
        const nx = x + off;
        if (nx < k * CELL_W || nx >= (k + 1) * CELL_W) continue;
        data.copy(out, (y * CELL_W * 4 + nx) * 4, (y * w + x) * 4, (y * w + x) * 4 + 4);
      }
  }
  return { data: out, width: CELL_W * 4 };
}

for (const [src, out, cutout, near, far, erase, shadow] of jobs) {
  const dest = path.join(OUT, out);
  mkdirSync(path.dirname(dest), { recursive: true });
  let img = sharp(path.join(SRC, src)).ensureAlpha();
  if (erase) {
    const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
    erasePlaceholder(data, info.width, erase);
    img = sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } });
  }
  if (cutout) {
    const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
    removeBackground(data, info.width, info.height, near, far, shadow);
    if (out.startsWith('characters/')) {
      const r = reslice(data, info.width, info.height);
      img = sharp(r.data, { raw: { width: r.width, height: info.height, channels: 4 } });
    } else img = sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } });
  }
  // Icons are scaled down for cards; everything is palette-quantized to save size
  if (out.includes('icon-')) img = sharp(await img.png().toBuffer()).resize({ width: 480 });
  await img.png({ compressionLevel: 9, palette: true, quality: 92, dither: 0.6 }).toFile(dest);
  console.log('✓', out);
}

// Overlay containing only the backrest of the chair to sit in (row 3 left/right) from the eye-level classroom photo.
// Putting the character under this layer lets the backrest cover the body so they look seated.
// Chairs are reddish brown, so they are separated from wooden desks and floor by R/G ratio (catches shaded chairs too)
{
  const src = path.join(OUT, 'places/classroom-backview.png');
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  const out = Buffer.alloc(W * H * 4);
  for (const [x0, y0, x1, y1] of [[70, 850, 285, 965], [680, 850, 895, 965]])
    for (let y = y0; y < y1; y++)
      for (let x = x0; x < x1; x++) {
        const i = (y * W + x) * 4;
        const a = Math.max(0, Math.min(1, (data[i] / (data[i + 1] + 1) - 1.42) / 0.22));
        if (a > 0) {
          data.copy(out, i, i, i + 3);
          out[i + 3] = Math.round(a * 255);
        }
      }
  await sharp(out, { raw: { width: W, height: H, channels: 4 } }).png({ compressionLevel: 9, palette: true }).toFile(path.join(OUT, 'places/classroom-backview-chairs.png'));
  console.log('✓ places/classroom-backview-chairs.png');
}

// Classroom props (transparent PNG) → sound setting icons. Erase faint color fringes (low-alpha pixels), trim margins and scale down
{
  const props = [
    ['ChatGPT 이미지 2026년 9월 29일 오후 05_52_59-1.png', 'prop-desk.png'],
    ['ChatGPT 이미지 2026년 9월 29일 오후 05_53_00-2.png', 'prop-teacher-desk.png'],
    ['ChatGPT 이미지 2026년 9월 29일 오후 05_53_00-3.png', 'prop-blackboard.png'],
    ['ChatGPT 이미지 2026년 9월 29일 오후 05_53_02-4.png', 'prop-bookshelf.png'],
    ['ChatGPT 이미지 2026년 9월 29일 오후 05_53_03-5.png', 'prop-door.png'],
    ['ChatGPT 이미지 2026년 9월 29일 오후 05_53_04-6.png', 'prop-clock.png'],
  ];
  mkdirSync(path.join(OUT, 'places/props'), { recursive: true });
  for (const [src, out] of props) {
    const { data, info } = await sharp(path.join(SRC, 'classroom', src)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    for (let i = 3; i < data.length; i += 4) if (data[i] < 64) data[i] = 0;
    const trimmed = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
    await sharp(trimmed)
      .trim({ threshold: 0 })
      .resize({ width: 240, height: 240, fit: 'inside' })
      .png({ compressionLevel: 9, palette: true, quality: 92 })
      .toFile(path.join(OUT, 'places/props', out));
    console.log('✓ places/props/' + out);
  }
}

// ───────── Added 2026-09-30: brand, other places, reward items, customization parts ─────────
{
  const out = (p) => { const d = path.join(OUT, p); mkdirSync(path.dirname(d), { recursive: true }); return d; };

  // Logo wordmark: crop only the lettering from the card and make the white background transparent
  {
    const crop = await sharp(path.join(SRC, 'brand/moodee-logo-wordmark.png')).extract({ left: 38, top: 96, width: 516, height: 236 }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    removeBackground(crop.data, crop.info.width, crop.info.height, 16, 34);
    await sharp(crop.data, { raw: { width: crop.info.width, height: crop.info.height, channels: 4 } }).trim().png({ compressionLevel: 9 }).toFile(out('brand/logo.png'));
    console.log('✓ brand/logo.png');
  }
  // App icon: only the rounded-square part (used as favicon and mascot)
  {
    const size = 256;
    const mask = Buffer.from(`<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="58" ry="58"/></svg>`);
    await sharp(path.join(SRC, 'brand/moodee-app-icon.png')).extract({ left: 19, top: 62, width: size, height: size })
      .composite([{ input: mask, blend: 'dest-in' }]).png({ compressionLevel: 9 }).toFile(out('brand/icon.png'));
    console.log('✓ brand/icon.png');
  }
  // Other place backgrounds (JPEG, based on 941px portrait width)
  for (const [src, dst] of [
    ['cafe/cafe-backview.png', 'places/cafe-backview.jpg'], ['cafe/cafe-topdown.png', 'places/cafe-topdown.jpg'],
    ['library/library-backview.png', 'places/library-backview.jpg'], ['library/library-topdown.png', 'places/library-topdown.jpg'],
    ['museum/museum-backview-pedestal.png', 'places/museum-backview.jpg'], ['museum/museum-topdown.png', 'places/museum-topdown.jpg'],
    ['myroom/myroom-background.png', 'places/myroom.jpg'],
  ]) {
    await sharp(path.join(SRC, src)).resize({ width: 941, withoutEnlargement: true }).flatten({ background: '#ffffff' }).jpeg({ quality: 84 }).toFile(out(dst));
    console.log('✓ ' + dst);
  }
  // Crop the reward item art from the membership mockup
  for (const [name, left, top, width, height] of [
    ['sneakers', 501, 2714, 317, 208], ['headband', 977, 2714, 267, 208], ['jacket', 1394, 2697, 293, 225], ['coins', 159, 2421, 242, 151],
  ]) {
    const crop = sharp(path.join(SRC, 'reference/ui-membership-mockup.png')).extract({ left, top, width, height });
    if (name === 'coins') {
      // The coin pile sits directly on the card, so remove its background
      const { data, info } = await crop.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      removeBackground(data, info.width, info.height, 10, 26);
      await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).trim().resize({ width: 260 }).png({ compressionLevel: 9 }).toFile(out(`rewards/${name}.png`));
    } else await crop.resize({ width: 260 }).png({ compressionLevel: 9, palette: true }).toFile(out(`rewards/${name}.png`));
    console.log(`✓ rewards/${name}.png`);
  }
  // Customization parts sheet (for the wardrobe preview)
  for (const n of ['parts-hair', 'parts-tops', 'parts-bottoms', 'parts-glasses']) {
    await sharp(path.join(SRC, `customize/${n}.png`)).resize({ width: 1000, withoutEnlargement: true }).flatten({ background: '#ffffff' }).jpeg({ quality: 86 }).toFile(out(`customize/${n}.jpg`));
    console.log(`✓ customize/${n}.jpg`);
  }

  // Backrest overlay for the front-row chairs (rows 1 and 2) of the eye-level classroom: used for seated classmates
  const src = path.join(OUT, 'places/classroom-backview.png');
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  // Crop only around the chairs where friends sit (cropping wide also catches red objects like the bookshelf, which then float above the sunlight layer)
  for (const [row, y0, y1, xs] of [[1, 568, 640, [[600, 730]]], [2, 655, 780, [[185, 342], [796, 941]]]]) {
    const o = Buffer.alloc(W * H * 4);
    for (let y = y0; y < y1; y++)
      for (let x = 0; x < W; x++) {
        if (!xs.some(([a, b]) => x >= a && x < b)) continue;
        const i = (y * W + x) * 4;
        const a = Math.max(0, Math.min(1, (data[i] / (data[i + 1] + 1) - 1.42) / 0.22));
        if (a > 0) { data.copy(o, i, i, i + 3); o[i + 3] = Math.round(a * 255); }
      }
    await sharp(o, { raw: { width: W, height: H, channels: 4 } }).png({ compressionLevel: 9, palette: true }).toFile(out(`places/classroom-backview-chairs-row${row}.png`));
    console.log(`✓ places/classroom-backview-chairs-row${row}.png`);
  }
}

// ───────── Individual wardrobe part tiles + space objects ─────────
{
  const out = (p) => { const d = path.join(OUT, p); mkdirSync(path.dirname(d), { recursive: true }); return d; };
  // [source, prefix, column start xs, row start ys, cell width, cell height]
  const grid = (x0, w, n) => Array.from({ length: n }, (_, i) => Math.round(x0 + i * w));
  const sheets = [
    ['customize/parts-hair.png', 'hair', grid(22, 278.5, 6), [72, 376], 276, 308],
    ['customize/parts-glasses.png', 'glasses', [78, 312, 560], [140, 282, 425, 565], 250, 132],
    ['customize/parts-tops.png', 'tops', grid(8, 241, 7), [62, 292, 520], 238, 226],
    ['customize/parts-bottoms.png', 'bottoms', [22, 245, 485, 712, 950, 1180], [[80, 200], [278, 225], [498, 248]], 232, 0],
  ];
  for (const [src, prefix, xs, ys, w, h] of sheets) {
    const meta = await sharp(path.join(SRC, src)).metadata();
    let n = 0;
    for (const row of ys)
      for (const x of xs) {
        n++;
        // A row is a single y value or a [y, height] pair (sheets whose rows differ in height)
        const [y, rowH] = Array.isArray(row) ? row : [row, h];
        const width = Math.min(w, meta.width - x), height = Math.min(rowH, meta.height - y);
        await sharp(path.join(SRC, src)).extract({ left: x, top: y, width, height }).flatten({ background: '#fafafa' })
          .resize({ width: 200, height: 200, fit: 'contain', background: '#fafafa' }).jpeg({ quality: 86 })
          .toFile(out(`customize/${prefix}-${String(n).padStart(2, '0')}.jpg`));
      }
    console.log(`✓ customize/${prefix}-01..${n}.jpg`);
  }
  // Café mug & library book: remove white background
  for (const [src, dst] of [['cafe/cafe-prop-glass-mug.png', 'objects/mug.png'], ['library/library-prop-open-book.png', 'objects/book.png']]) {
    const { data, info } = await sharp(path.join(SRC, src)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    removeBackground(data, info.width, info.height, 12, 26);
    await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).trim().resize({ width: 300, height: 300, fit: 'inside' }).png({ compressionLevel: 9 }).toFile(out(dst));
    console.log('✓ ' + dst);
  }
  await sharp(path.join(SRC, 'cafe/cafe-ingredient-icons-3d.png')).resize({ width: 800 }).png({ compressionLevel: 9 }).toFile(out('objects/cafe-ingredients.png'));
  console.log('✓ objects/cafe-ingredients.png');
}

// ───────── Museum exhibits (on-site photos → 3D objects) + My Room room styles ─────────
{
  const out = (p) => { const d = path.join(OUT, p); mkdirSync(path.dirname(d), { recursive: true }); return d; };
  const EX = '박물관 전시';
  // Photos: originals shown in the viewfinder
  for (const n of ['banana-milk', 'pringles', 'whiteboard-stand', 'team-drawing', 'hackathon-banner']) {
    await sharp(path.join(SRC, EX, `photo-${n}.png`)).flatten({ background: '#ffffff' }).jpeg({ quality: 88 }).toFile(out(`exhibits/photo-${n}.jpg`));
  }
  // Objects: remove the white background so they can sit on a pedestal
  for (const n of ['banana-milk', 'pringles', 'team-whiteboard', 'hackathon-banner', 'duck-sock']) {
    const { data, info } = await sharp(path.join(SRC, EX, `object-${n}.png`)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    removeBackground(data, info.width, info.height, 8, 20);
    await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).trim().resize({ width: 520, height: 520, fit: 'inside' }).png({ compressionLevel: 9 }).toFile(out(`exhibits/object-${n}.png`));
  }
  console.log('✓ exhibits/photo-*.jpg, object-*.png');

  // Room styles: only the room art from the customization mockup (excluding the top title and bottom furniture bar)
  for (const n of ['1-empty', '2-desk', '3-cozy', '4-full', '5-loft']) {
    const src = path.join(SRC, 'myroom', `myroom-decorate-${n}.png`);
    const m = await sharp(src).metadata();
    const top = Math.round(m.height * 0.068), height = Math.round(m.height * 0.748);
    await sharp(src).extract({ left: 0, top, width: m.width, height }).resize({ width: 941 }).flatten({ background: '#ffffff' }).jpeg({ quality: 84 }).toFile(out(`places/room-${n}.jpg`));
    console.log(`✓ places/room-${n}.jpg`);
  }
}

// ───────── Loading screen illustrations (portrait): one at random on app start and place change ─────────
{
  const dir = path.join(SRC, 'splash/portrait');
  const outDir = path.join(OUT, 'splash');
  mkdirSync(outDir, { recursive: true });
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.png'))) {
    await sharp(path.join(dir, f)).resize({ width: 720 }).jpeg({ quality: 82 }).toFile(path.join(outDir, f.replace('cloudee-', '').replace('.png', '.jpg')));
  }
  console.log('✓ splash/*.jpg');
}

// ───────── World upgrade: Cloudy mascot sheet · transparent glass · ingredient tiles · café/library activity screens ─────────
{
  const out = (p) => { const d = path.join(OUT, p); mkdirSync(path.dirname(d), { recursive: true }); return d; };

  // Cloudy: arrange the four cut-outs (brand/cloudy) into the same 4-frame sheet as the other characters (front/side/back/opposite side)
  // Scale all four by a common factor so they share the same size reference (side view faces left → opposite side is flipped)
  const cloudy = async (n) => sharp(path.join(SRC, `brand/cloudy/cloudy-${n}.png`)).trim().toBuffer({ resolveWithObject: true });
  const parts = { front: await cloudy('front'), side: await cloudy('side'), back: await cloudy('back') };
  const widest = Math.max(...Object.values(parts).map((x) => x.info.width));
  const scale = 372 / widest;
  const fit = async (x) => sharp(x.data).resize({ width: Math.round(x.info.width * scale) }).png().toBuffer();
  const [front, side, back] = await Promise.all([fit(parts.front), fit(parts.side), fit(parts.back)]);
  const cells = [front, side, back, await sharp(side).flop().toBuffer()];
  const comps = [];
  for (let i = 0; i < 4; i++) {
    const m = await sharp(cells[i]).metadata();
    comps.push({ input: cells[i], left: i * 400 + Math.round((400 - m.width) / 2), top: 850 - m.height });
  }
  await sharp({ create: { width: 1600, height: 1086, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(comps).png({ compressionLevel: 9 }).toFile(out('characters/char-cloudy.png'));
  await sharp(path.join(SRC, 'brand/cloudy/cloudy-three-quarter.png')).trim().resize({ width: 420 }).png().toFile(out('characters/cloudy-three-quarter.png'));
  console.log('✓ characters/char-cloudy.png');

  // Transparent glass (drink making & table)
  await sharp(path.join(SRC, 'cafe/cafe-glass-transparent-soft.png')).resize({ width: 520 }).png({ compressionLevel: 9 }).toFile(out('cafe/glass.png'));
  // 6 ingredient icons: cut the 3×2 sheet into cells, trim transparent margins and center each in the same square
  const names = ['coffee', 'milk', 'syrup', 'strawberry', 'orange', 'matcha'];
  const icons = path.join(SRC, 'cafe/cafe-ingredient-icons-3d.png');
  // The sheet's cell boundaries are uneven, so find the three blobs by transparent vertical gaps (top and bottom rows separately)
  const sheetRaw = await sharp(icons).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const SW = sheetRaw.info.width, SH = sheetRaw.info.height;
  const solid = (x, y) => sheetRaw.data[(y * SW + x) * 4 + 3] > 24;
  const boxes = [];
  for (const [ry0, ry1] of [[0, SH / 2], [SH / 2, SH]]) {
    const cols = [];
    for (let x = 0; x < SW; x++) { let c = 0; for (let y = ry0; y < ry1; y++) if (solid(x, y)) c++; cols.push(c); }
    const runs = []; let start = -1;
    for (let x = 0; x <= SW; x++) {
      const on = x < SW && cols[x] > 0;
      if (on && start < 0) start = x;
      if (!on && start >= 0) { if (x - start > 40) runs.push([start, x - 1]); start = -1; }
    }
    // If a gap is too small and blobs merge, use them as-is rather than evenly splitting the longest one
    for (const [x0, x1] of runs.slice(0, 3)) {
      let y0 = ry1, y1 = ry0;
      for (let y = ry0; y < ry1; y++) for (let x = x0; x <= x1; x++) if (solid(x, y)) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); break; }
      boxes.push({ left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 });
    }
  }
  if (boxes.length !== 6) throw new Error('Ingredient icon blob count is not 6: ' + boxes.length);
  for (let i = 0; i < 6; i++) {
    const cell = await sharp(icons).extract(boxes[i]).resize({ width: 220, height: 220, fit: 'inside' }).png().toBuffer();
    await sharp({ create: { width: 240, height: 240, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: cell, gravity: 'center' }]).png({ compressionLevel: 9 }).toFile(out(`cafe/ingredient-${names[i]}.png`));
  }
  // 6 liquid textures: scale to 512px, then mirror-tile (2×2) into a seamless 1024px tile → repeats as it flows inside the cup mask
  for (const n of names) {
    const tile = await sharp(path.join(SRC, `cafe/liquids/liquid-${n}.png`)).resize(512, 512).toBuffer();
    const flipX = await sharp(tile).flop().toBuffer();
    const flipY = await sharp(tile).flip().toBuffer();
    const flipXY = await sharp(tile).flip().flop().toBuffer();
    await sharp({ create: { width: 1024, height: 1024, channels: 3, background: '#000' } })
      .composite([{ input: tile, left: 0, top: 0 }, { input: flipX, left: 512, top: 0 }, { input: flipY, left: 0, top: 512 }, { input: flipXY, left: 512, top: 512 }])
      .jpeg({ quality: 82 }).toFile(out(`cafe/liquid-${n}.jpg`));
  }
  console.log('✓ cafe/ingredient-*.png, cafe/liquid-*.jpg');
  // Counter close-up (drink making background) + the wooden top below it (table screen)
  const counter = path.join(SRC, 'cafe/cafe-counter-closeup.png');
  await sharp(counter).flatten({ background: '#ffffff' }).jpeg({ quality: 84 }).toFile(out('cafe/counter-closeup.jpg'));
  await sharp(counter).extract({ left: 120, top: 1000, width: 640, height: 600 }).flatten({ background: '#ffffff' }).jpeg({ quality: 84 }).toFile(out('cafe/table-top.jpg'));
  // Library: eye-level scene, open book (large)
  await sharp(path.join(SRC, 'library/library-eyelevel-people.png')).flatten({ background: '#ffffff' }).jpeg({ quality: 84 }).toFile(out('library/eyelevel.jpg'));
  await sharp(path.join(SRC, 'library/library-prop-open-book.png')).png({ compressionLevel: 9 }).toFile(out('library/open-book.png'));
  // My Room top view
  await sharp(path.join(SRC, 'myroom/myroom-topdown.png')).flatten({ background: '#ffffff' }).jpeg({ quality: 84 }).toFile(out('places/myroom-topdown.jpg'));
  // Museum top view (portrait) and demo video
  await sharp(path.join(SRC, 'museum/museum-topdown-portrait.png')).resize({ width: 941 }).flatten({ background: '#ffffff' }).jpeg({ quality: 84 }).toFile(out('places/museum-topdown-portrait.jpg'));
  copyFileSync(path.join(SRC, '박물관 전시/KakaoTalk_20260930_144748802.mp4'), out('museum/demo-capture.mp4'));
  console.log('✓ cafe/*, library/*, museum/*, places/myroom-topdown.jpg');
}

// ───────── Landscape illustrations (membership banner, etc.): splash/landscape → splash-wide/*.jpg ─────────
{
  const dir = path.join(SRC, 'splash/landscape');
  const outDir = path.join(OUT, 'splash-wide');
  mkdirSync(outDir, { recursive: true });
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.png'))) {
    await sharp(path.join(dir, f)).resize({ width: 900 }).jpeg({ quality: 82 }).toFile(path.join(outDir, f.replace('cloudee-', '').replace('-wide.png', '.jpg')));
  }
  console.log('✓ splash-wide/*.jpg');
}

// ───────── Board Café minigame assets: cafe/game → boardcafe/ ─────────
{
  const G = path.join(SRC, 'cafe/game');
  const outDir = path.join(OUT, 'boardcafe');
  mkdirSync(outDir, { recursive: true });
  const fit = async (src, name, width, jpg = false) => {
    const img = sharp(path.join(G, src)).resize({ width, withoutEnlargement: true });
    await (jpg ? img.flatten({ background: '#ffffff' }).jpeg({ quality: 84 }) : img.png({ compressionLevel: 9 })).toFile(path.join(outDir, name));
  };
  await fit('boardcafe_gamebox_closed.png', 'gamebox-closed.png', 520);
  await fit('boardcafe_gamebox_open.png', 'gamebox-open.png', 520);
  await fit('cloudtiles_box_cover.png', 'cloudtiles-cover.png', 420);
  for (const f of readdirSync(G).filter((f) => f.startsWith('cloudtiles_pattern_'))) await fit(f, f.replace('cloudtiles_pattern_', 'pattern-'), 320);
  for (const f of readdirSync(G).filter((f) => f.startsWith('cloudmatch_card_'))) await fit(f, f.replace('cloudmatch_card_', 'card-').replace('.png', '.jpg'), 300, true);
  for (const [src, name, w] of [
    ['ui_speech_bubble_cloud.png', 'ui-bubble.png', 480], ['ui_input_bar.png', 'ui-input-bar.png', 700], ['ui_talk_turn_bubbles.png', 'ui-talk.png', 360],
    ['ui_label_bars_3colors.png', 'ui-labels.png', 600], ['wordrelay_ui_word_arrow.png', 'wordrelay-arrow.png', 600], ['cloudee_peek.png', 'cloudee-peek.png', 360],
    ['reactions/reaction_00_waiting.png', 'reaction-waiting.png', 360], ['reactions/reaction_01_idle.png', 'reaction-idle.png', 360],
    ['reactions/reaction_02_nice.png', 'reaction-nice.png', 360], ['reactions/reaction_03_celebrate.png', 'reaction-celebrate.png', 360],
    ['reactions/reaction_04_cloud_completed_banner.png', 'banner-completed.png', 620], ['reactions/reaction_seq1_idle.png', 'seq-1.png', 160],
    ['reactions/reaction_seq2_nice.png', 'seq-2.png', 160], ['reactions/reaction_seq3_celebrate.png', 'seq-3.png', 180],
  ]) await fit(src, name, w);
  // Number tiles 1–6: cut the 2-column × 3-row sheet into cells and trim transparent margins
  const sheet = path.join(G, 'cloudtiles_number_tiles_1-6.png');
  const { data, info } = await sharp(sheet).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const cw = info.width / 2, ch = info.height / 3;
  for (let i = 0; i < 6; i++) {
    const cx = (i % 2) * cw, cy = Math.floor(i / 2) * ch;
    let x0 = 1e9, y0 = 1e9, x1 = 0, y1 = 0;
    for (let y = Math.floor(cy); y < cy + ch; y++) for (let x = Math.floor(cx); x < cx + cw; x++) if (data[(y * info.width + x) * 4 + 3] > 30) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    await sharp(sheet).extract({ left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 }).resize({ width: 200, height: 200, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png({ compressionLevel: 9 }).toFile(path.join(outDir, `tile-${i + 1}.png`));
  }
  console.log('✓ boardcafe/*');
}

// Board Café number tiles in 4 colors: recolor only the saturated part (body) of the blue tile, keeping the white number and highlights
{
  const dir = path.join(OUT, 'boardcafe');
  const rgb2hsl = (r, g, b) => {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
    if (mx === mn) return [0, 0, l];
    const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h * 60, s, l];
  };
  const hsl2rgb = (h, s, l) => {
    const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
    return [f(0) * 255, f(8) * 255, f(4) * 255];
  };
  const TINTS = { sky: null, sunset: [26, 1.15, 0.03], dream: [262, 0.85, 0.06], forest: [130, 0.7, 0.0] };
  for (let n = 1; n <= 6; n++) {
    const { data, info } = await sharp(path.join(dir, `tile-${n}.png`)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    for (const [name, t] of Object.entries(TINTS)) {
      const out = Buffer.from(data);
      if (t) for (let i = 0; i < out.length; i += 4) {
        const [, s, l] = rgb2hsl(out[i], out[i + 1], out[i + 2]);
        if (s < 0.22 || l > 0.9) continue; // Keep white numbers and bright highlights
        const [r, g, b] = hsl2rgb(t[0], Math.min(1, s * t[1]), Math.min(0.95, l + t[2]));
        out[i] = r; out[i + 1] = g; out[i + 2] = b;
      }
      await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).resize(160).png({ compressionLevel: 9 }).toFile(path.join(dir, `tile-${name}-${n}.png`));
    }
  }
  console.log('✓ boardcafe/tile-{color}-{n}.png');
}
