// 원본 참고 이미지(2026글로벌해커톤)를 앱 규격 경로/이름으로 정리하는 스크립트
// - 캐릭터 시트·장소 아이콘: 테두리에서 flood fill로 단색 배경(회색/흰색)을 투명 처리
// - 교실 배경: 그대로 복사(용량만 최적화)
import sharp from 'sharp';
import { copyFileSync, mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';

// 원본 참고자료는 프로젝트 상위 폴더(2026글로벌해커톤)에 있음
const SRC = path.resolve('..');
const OUT = path.resolve('public/assets');

// 캐릭터 발밑의 회색 그림자(원본 회색 배경에 붙어 있던 것) → 앱에서 부드러운 그림자로 대체
const CHAR_SHADOW = { minLum: 52, maxLum: 106, maxSat: 16, yMin: 0.752 }; // 바지 밑단(≈0.745) 아래만: 회색 바지 보존
// 흰 배경 아이콘 아래 연회색 그림자 → 어두운 휠 위에서 흰 얼룩으로 보여서 제거
const ICON_SHADOW = { minLum: 150, maxLum: 256, maxSat: 14, yMin: 0 };

const jobs = [
  // [원본, 결과, 배경제거 여부, 투명 임계값(near), 부분투명 임계값(far), 교실 인형 지우기, 바닥 그림자 제거]
  // 바닥 그림자: 배경과 이어진 무채색 픽셀 중 밝기가 [min, max]이고 이미지 높이 비율 yMin 아래인 것
  ['캐릭터/2.민경.png', 'characters/char-ponytail.png', true, 22, 44, null, CHAR_SHADOW],
  ['캐릭터/1.김다현.png', 'characters/char-bob.png', true, 22, 44, null, CHAR_SHADOW],
  ['캐릭터/3.niersora.png', 'characters/char-wavy.png', true, 22, 44, null, CHAR_SHADOW],
  ['캐릭터/4. Nazan.png', 'characters/char-curly-glasses.png', true, 22, 44, null, CHAR_SHADOW],
  // 교실 배경: 캐릭터 자리의 흰색 임시 인형을 지움 → 머리 원·몸통 사각형·복사해 올 바닥 오프셋
  ['classroom/image 22.png', 'places/classroom-topdown.png', false, 0, 0, { head: [477, 1037, 46], body: [428, 1050, 528, 1130], from: [0, 150] }],
  ['classroom/image 17.png', 'places/classroom-backview.png', false, 0, 0, { head: [476, 1024, 74], body: [394, 1028, 556, 1196], from: [0, 250] }],
  ['아이콘/image 29.png', 'places/icon-classroom.png', true, 20, 40],
  ['아이콘/image 23.png', 'places/icon-my-room.png', true, 10, 22, null, ICON_SHADOW],
  ['아이콘/image 24.png', 'places/icon-library.png', true, 10, 22, null, ICON_SHADOW],
  ['아이콘/image 28.png', 'places/icon-museum.png', true, 20, 40],
  ['아이콘/image 31.png', 'places/icon-cafe.png', true, 10, 22, null, ICON_SHADOW],
];

// 테두리와 연결된 배경색 픽셀만 지워서 캐릭터 내부의 비슷한 색은 보존
function removeBackground(data, w, h, near, far, shadow) {
  const px = (i) => [data[i * 4], data[i * 4 + 1], data[i * 4 + 2]];
  // 네 모서리 평균을 배경색으로 사용
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
      // 무채색 그림자 픽셀은 배경과 같게 취급(완전 투명 + 계속 번짐)
      if (Math.max(r, g, b) - Math.min(r, g, b) <= shadow.maxSat && lum >= shadow.minLum && lum < shadow.maxLum && i / w >= shadow.yMin * h) d = 0;
    }
    if (d > far) continue;
    // near 이하는 완전 투명, near~far 구간은 가장자리 부드럽게
    const a = d <= near ? 0 : Math.round(((d - near) / (far - near)) * 255);
    data[i * 4 + 3] = Math.min(data[i * 4 + 3], a);
    if (d > near) continue; // 가장자리 픽셀에서는 더 번지지 않음
    const x = i % w;
    if (x > 0) stack.push(i - 1);
    if (x < w - 1) stack.push(i + 1);
    if (i >= w) stack.push(i - w);
    if (i < w * (h - 1)) stack.push(i + w);
  }
}

// 임시 인형 모양(머리 원 + 몸통 둥근 사각형) 마스크를 만들고,
// 같은 통로의 아래쪽 바닥 패치를 복사해 덮은 뒤 가장자리를 부드럽게 섞음
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
  // 박스 블러로 부드러운 알파(반경 9)
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
      // 인형 경계선까지 확실히 덮도록 가중
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

// 원본 시트는 머리카락이 컷 경계를 넘는 경우가 있어서(예: curly 앞모습),
// 경계 근처에서 가장 비어 있는 세로줄로 4등분한 뒤 각 인물을 넓은 컷(CELL_W) 가운데에 다시 배치
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
  // 아이콘은 카드용으로 축소, 전부 팔레트 양자화로 용량 절감
  if (out.includes('icon-')) img = sharp(await img.png().toBuffer()).resize({ width: 480 });
  await img.png({ compressionLevel: 9, palette: true, quality: 92, dither: 0.6 }).toFile(dest);
  console.log('✓', out);
}

// 눈높이 교실 사진에서 앉을 의자(3번째 줄 좌/우) 등받이만 떼어낸 오버레이.
// 캐릭터를 이 레이어 아래에 두면 등받이가 몸을 가려 앉은 것처럼 보인다.
// 의자는 붉은 갈색이라 R/G 비율로 나무 책상·바닥과 구분(그늘진 의자도 잡힘)
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

// 교실 소품(투명 PNG) → 소리 설정 아이콘. 가장자리의 옅은 색 번짐(알파 낮은 픽셀)을 지우고 여백을 잘라 축소
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

// ───────── 2026-09-30 추가: 브랜드·다른 장소·보상 아이템·꾸미기 파츠 ─────────
{
  const out = (p) => { const d = path.join(OUT, p); mkdirSync(path.dirname(d), { recursive: true }); return d; };

  // 로고 워드마크: 카드에서 글자 부분만 잘라 흰 배경을 투명하게
  {
    const crop = await sharp(path.join(SRC, 'brand/moodee-logo-wordmark.png')).extract({ left: 38, top: 96, width: 516, height: 236 }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    removeBackground(crop.data, crop.info.width, crop.info.height, 16, 34);
    await sharp(crop.data, { raw: { width: crop.info.width, height: crop.info.height, channels: 4 } }).trim().png({ compressionLevel: 9 }).toFile(out('brand/logo.png'));
    console.log('✓ brand/logo.png');
  }
  // 앱 아이콘: 둥근 사각형 부분만(파비콘·마스코트로 사용)
  {
    const size = 256;
    const mask = Buffer.from(`<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="58" ry="58"/></svg>`);
    await sharp(path.join(SRC, 'brand/moodee-app-icon.png')).extract({ left: 19, top: 62, width: size, height: size })
      .composite([{ input: mask, blend: 'dest-in' }]).png({ compressionLevel: 9 }).toFile(out('brand/icon.png'));
    console.log('✓ brand/icon.png');
  }
  // 다른 장소 배경(세로 941px 폭 기준 JPEG)
  for (const [src, dst] of [
    ['cafe/cafe-backview.png', 'places/cafe-backview.jpg'], ['cafe/cafe-topdown.png', 'places/cafe-topdown.jpg'],
    ['library/library-backview.png', 'places/library-backview.jpg'], ['library/library-topdown.png', 'places/library-topdown.jpg'],
    ['museum/museum-backview-pedestal.png', 'places/museum-backview.jpg'], ['museum/museum-topdown.png', 'places/museum-topdown.jpg'],
    ['myroom/myroom-background.png', 'places/myroom.jpg'],
  ]) {
    await sharp(path.join(SRC, src)).resize({ width: 941, withoutEnlargement: true }).flatten({ background: '#ffffff' }).jpeg({ quality: 84 }).toFile(out(dst));
    console.log('✓ ' + dst);
  }
  // 멤버십 시안에서 보상 아이템 그림 잘라내기
  for (const [name, left, top, width, height] of [
    ['sneakers', 501, 2714, 317, 208], ['headband', 977, 2714, 267, 208], ['jacket', 1394, 2697, 293, 225], ['coins', 159, 2421, 242, 151],
  ]) {
    const crop = sharp(path.join(SRC, 'reference/ui-membership-mockup.png')).extract({ left, top, width, height });
    if (name === 'coins') {
      // 코인 더미는 카드 위에 바로 올리므로 배경을 지운다
      const { data, info } = await crop.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      removeBackground(data, info.width, info.height, 10, 26);
      await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).trim().resize({ width: 260 }).png({ compressionLevel: 9 }).toFile(out(`rewards/${name}.png`));
    } else await crop.resize({ width: 260 }).png({ compressionLevel: 9, palette: true }).toFile(out(`rewards/${name}.png`));
    console.log(`✓ rewards/${name}.png`);
  }
  // 꾸미기 파츠 시트(옷장 미리보기용)
  for (const n of ['parts-hair', 'parts-tops', 'parts-bottoms', 'parts-glasses']) {
    await sharp(path.join(SRC, `customize/${n}.png`)).resize({ width: 1000, withoutEnlargement: true }).flatten({ background: '#ffffff' }).jpeg({ quality: 86 }).toFile(out(`customize/${n}.jpg`));
    console.log(`✓ customize/${n}.jpg`);
  }

  // 눈높이 교실의 앞줄 의자(1·2번째 줄) 등받이 오버레이: 같은 반 친구들이 앉은 모습에 사용
  const src = path.join(OUT, 'places/classroom-backview.png');
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  // 친구가 앉는 의자 주변만 잘라냄(넓게 잡으면 책장 등 붉은 물체까지 포함되어 햇살 레이어 위로 떠 보임)
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

// ───────── 옷장 파츠 낱개 타일 + 공간 오브젝트 ─────────
{
  const out = (p) => { const d = path.join(OUT, p); mkdirSync(path.dirname(d), { recursive: true }); return d; };
  // [원본, 접두사, 열 시작 x들, 행 시작 y들, 칸 폭, 칸 높이]
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
        // 행은 y 값 하나이거나 [y, 높이] 쌍(행마다 높이가 다른 시트)
        const [y, rowH] = Array.isArray(row) ? row : [row, h];
        const width = Math.min(w, meta.width - x), height = Math.min(rowH, meta.height - y);
        await sharp(path.join(SRC, src)).extract({ left: x, top: y, width, height }).flatten({ background: '#fafafa' })
          .resize({ width: 200, height: 200, fit: 'contain', background: '#fafafa' }).jpeg({ quality: 86 })
          .toFile(out(`customize/${prefix}-${String(n).padStart(2, '0')}.jpg`));
      }
    console.log(`✓ customize/${prefix}-01..${n}.jpg`);
  }
  // 카페 머그컵·도서관 책: 흰 배경 제거
  for (const [src, dst] of [['cafe/cafe-prop-glass-mug.png', 'objects/mug.png'], ['library/library-prop-open-book.png', 'objects/book.png']]) {
    const { data, info } = await sharp(path.join(SRC, src)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    removeBackground(data, info.width, info.height, 12, 26);
    await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).trim().resize({ width: 300, height: 300, fit: 'inside' }).png({ compressionLevel: 9 }).toFile(out(dst));
    console.log('✓ ' + dst);
  }
  await sharp(path.join(SRC, 'cafe/cafe-ingredient-icons-3d.png')).resize({ width: 800 }).png({ compressionLevel: 9 }).toFile(out('objects/cafe-ingredients.png'));
  console.log('✓ objects/cafe-ingredients.png');
}

// ───────── 박물관 전시물(현장 사진 → 3D 오브젝트) + My Room 방 스타일 ─────────
{
  const out = (p) => { const d = path.join(OUT, p); mkdirSync(path.dirname(d), { recursive: true }); return d; };
  const EX = '박물관 전시';
  // 사진: 뷰파인더에 보일 원본
  for (const n of ['banana-milk', 'pringles', 'whiteboard-stand', 'team-drawing', 'hackathon-banner']) {
    await sharp(path.join(SRC, EX, `photo-${n}.png`)).flatten({ background: '#ffffff' }).jpeg({ quality: 88 }).toFile(out(`exhibits/photo-${n}.jpg`));
  }
  // 오브젝트: 흰 배경을 지워 받침대 위에 올릴 수 있게
  for (const n of ['banana-milk', 'pringles', 'team-whiteboard', 'hackathon-banner', 'duck-sock']) {
    const { data, info } = await sharp(path.join(SRC, EX, `object-${n}.png`)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    removeBackground(data, info.width, info.height, 8, 20);
    await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).trim().resize({ width: 520, height: 520, fit: 'inside' }).png({ compressionLevel: 9 }).toFile(out(`exhibits/object-${n}.png`));
  }
  console.log('✓ exhibits/photo-*.jpg, object-*.png');

  // 방 스타일: 꾸미기 시안에서 방 그림 부분만(상단 제목·하단 가구 바 제외)
  for (const n of ['1-empty', '2-desk', '3-cozy', '4-full', '5-loft']) {
    const src = path.join(SRC, 'myroom', `myroom-decorate-${n}.png`);
    const m = await sharp(src).metadata();
    const top = Math.round(m.height * 0.068), height = Math.round(m.height * 0.748);
    await sharp(src).extract({ left: 0, top, width: m.width, height }).resize({ width: 941 }).flatten({ background: '#ffffff' }).jpeg({ quality: 84 }).toFile(out(`places/room-${n}.jpg`));
    console.log(`✓ places/room-${n}.jpg`);
  }
}

// ───────── 로딩 화면 일러스트(세로): 앱 시작·장소 이동 때 무작위로 한 장 ─────────
{
  const dir = path.join(SRC, 'splash/portrait');
  const outDir = path.join(OUT, 'splash');
  mkdirSync(outDir, { recursive: true });
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.png'))) {
    await sharp(path.join(dir, f)).resize({ width: 720 }).jpeg({ quality: 82 }).toFile(path.join(outDir, f.replace('cloudee-', '').replace('.png', '.jpg')));
  }
  console.log('✓ splash/*.jpg');
}

// ───────── 월드 업그레이드: Cloudy 마스코트 시트 · 투명 유리컵 · 재료 타일 · 카페/도서관 활동 화면 ─────────
{
  const out = (p) => { const d = path.join(OUT, p); mkdirSync(path.dirname(d), { recursive: true }); return d; };

  // Cloudy: 누끼 딴 네 장(brand/cloudy)을 다른 캐릭터와 같은 4컷 시트(앞/옆/뒤/반대 옆)로
  // 네 장이 같은 크기 기준을 쓰도록 공통 배율로 줄인다(옆모습은 왼쪽을 본다 → 반대 옆은 뒤집기)
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

  // 투명 유리컵(음료 만들기·테이블)
  await sharp(path.join(SRC, 'cafe/cafe-glass-transparent-soft.png')).resize({ width: 520 }).png({ compressionLevel: 9 }).toFile(out('cafe/glass.png'));
  // 재료 아이콘 6개: 3×2 시트를 칸별로 자르고 투명 여백을 정리해 같은 정사각형에 가운데 정렬
  const names = ['coffee', 'milk', 'syrup', 'strawberry', 'orange', 'matcha'];
  const icons = path.join(SRC, 'cafe/cafe-ingredient-icons-3d.png');
  // 시트의 칸 경계가 균등하지 않아, 투명한 세로 틈으로 세 덩어리를 찾는다(위·아래 줄 각각)
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
    // 틈이 작아 덩어리가 붙으면 가장 긴 것을 균등 분할하지 않고 있는 그대로 사용
    for (const [x0, x1] of runs.slice(0, 3)) {
      let y0 = ry1, y1 = ry0;
      for (let y = ry0; y < ry1; y++) for (let x = x0; x <= x1; x++) if (solid(x, y)) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); break; }
      boxes.push({ left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 });
    }
  }
  if (boxes.length !== 6) throw new Error('재료 아이콘 덩어리 수가 6이 아님: ' + boxes.length);
  for (let i = 0; i < 6; i++) {
    const cell = await sharp(icons).extract(boxes[i]).resize({ width: 220, height: 220, fit: 'inside' }).png().toBuffer();
    await sharp({ create: { width: 240, height: 240, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: cell, gravity: 'center' }]).png({ compressionLevel: 9 }).toFile(out(`cafe/ingredient-${names[i]}.png`));
  }
  // 액체 텍스처 6종: 512px로 줄인 뒤 거울 반복(2×2)으로 이음매 없는 1024px 타일을 만든다 → 컵 마스크 안에서 흘러가며 반복
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
  // 카운터 클로즈업(음료 만들기 배경) + 그 아래쪽 나무 상판(테이블 화면)
  const counter = path.join(SRC, 'cafe/cafe-counter-closeup.png');
  await sharp(counter).flatten({ background: '#ffffff' }).jpeg({ quality: 84 }).toFile(out('cafe/counter-closeup.jpg'));
  await sharp(counter).extract({ left: 120, top: 1000, width: 640, height: 600 }).flatten({ background: '#ffffff' }).jpeg({ quality: 84 }).toFile(out('cafe/table-top.jpg'));
  // 도서관: 눈높이 장면, 펼친 책(크게)
  await sharp(path.join(SRC, 'library/library-eyelevel-people.png')).flatten({ background: '#ffffff' }).jpeg({ quality: 84 }).toFile(out('library/eyelevel.jpg'));
  await sharp(path.join(SRC, 'library/library-prop-open-book.png')).png({ compressionLevel: 9 }).toFile(out('library/open-book.png'));
  // My Room 탑뷰
  await sharp(path.join(SRC, 'myroom/myroom-topdown.png')).flatten({ background: '#ffffff' }).jpeg({ quality: 84 }).toFile(out('places/myroom-topdown.jpg'));
  // Museum 탑뷰(세로)와 데모 영상
  await sharp(path.join(SRC, 'museum/museum-topdown-portrait.png')).resize({ width: 941 }).flatten({ background: '#ffffff' }).jpeg({ quality: 84 }).toFile(out('places/museum-topdown-portrait.jpg'));
  copyFileSync(path.join(SRC, '박물관 전시/KakaoTalk_20260930_144748802.mp4'), out('museum/demo-capture.mp4'));
  console.log('✓ cafe/*, library/*, museum/*, places/myroom-topdown.jpg');
}

// ───────── 가로 일러스트(멤버십 배너 등): splash/landscape → splash-wide/*.jpg ─────────
{
  const dir = path.join(SRC, 'splash/landscape');
  const outDir = path.join(OUT, 'splash-wide');
  mkdirSync(outDir, { recursive: true });
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.png'))) {
    await sharp(path.join(dir, f)).resize({ width: 900 }).jpeg({ quality: 82 }).toFile(path.join(outDir, f.replace('cloudee-', '').replace('-wide.png', '.jpg')));
  }
  console.log('✓ splash-wide/*.jpg');
}

// ───────── Board Café 미니게임 에셋: cafe/game → boardcafe/ ─────────
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
  // 숫자 타일 1~6: 2열×3행 시트를 칸별로 자르고 투명 여백 정리
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

// Board Café 숫자 타일 4색: 파란 타일의 채도 있는 부분(몸통)만 색상을 바꾸고 흰 숫자·하이라이트는 그대로
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
        if (s < 0.22 || l > 0.9) continue; // 흰 숫자·밝은 하이라이트는 유지
        const [r, g, b] = hsl2rgb(t[0], Math.min(1, s * t[1]), Math.min(0.95, l + t[2]));
        out[i] = r; out[i + 1] = g; out[i + 2] = b;
      }
      await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).resize(160).png({ compressionLevel: 9 }).toFile(path.join(dir, `tile-${name}-${n}.png`));
    }
  }
  console.log('✓ boardcafe/tile-{color}-{n}.png');
}
