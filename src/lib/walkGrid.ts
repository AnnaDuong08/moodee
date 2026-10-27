// 교실 탑뷰 이동: 충돌 판정 + 격자 A* 길찾기(탭한 곳까지 책상을 돌아서 걸어감)
import type { Rect } from '../data/places';

export interface Pt {
  x: number;
  y: number;
}

const RADIUS = 16; // 캐릭터 발 반경(이미지 px)
const CELL = 16;

export function makeWalker(bounds: Rect, blockers: readonly Rect[]) {
  const [bx0, by0, bx1, by1] = bounds;

  const free = (x: number, y: number) => {
    if (x < bx0 || x > bx1 || y < by0 || y > by1) return false;
    for (const [x0, y0, x1, y1] of blockers)
      if (x > x0 - RADIUS && x < x1 + RADIUS && y > y0 - RADIUS && y < y1 + RADIUS) return false;
    return true;
  };

  // 축별로 따로 이동해 벽에 닿으면 미끄러지듯 움직임
  const step = (p: Pt, dx: number, dy: number): Pt => {
    let { x, y } = p;
    if (free(x + dx, y)) x += dx;
    if (free(x, y + dy)) y += dy;
    return { x, y };
  };

  const cols = Math.ceil(bx1 / CELL) + 1;
  const rows = Math.ceil(by1 / CELL) + 1;
  const walkable = new Uint8Array(cols * rows);
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) walkable[r * cols + c] = free(c * CELL, r * CELL) ? 1 : 0;

  const toCell = (p: Pt) => [Math.round(p.x / CELL), Math.round(p.y / CELL)] as const;

  // 가장 가까운 걸을 수 있는 칸
  const nearestFree = (c: number, r: number): [number, number] | null => {
    for (let d = 0; d < 12; d++)
      for (let dr = -d; dr <= d; dr++)
        for (let dc = -d; dc <= d; dc++) {
          const cc = c + dc, rr = r + dr;
          if (cc >= 0 && rr >= 0 && cc < cols && rr < rows && walkable[rr * cols + cc]) return [cc, rr];
        }
    return null;
  };

  const path = (from: Pt, to: Pt): Pt[] => {
    const s = nearestFree(...toCell(from));
    const g = nearestFree(...toCell(to));
    if (!s || !g) return [];
    const start = s[1] * cols + s[0], goal = g[1] * cols + g[0];
    const gScore = new Float32Array(cols * rows).fill(Infinity);
    const came = new Int32Array(cols * rows).fill(-1);
    const open: number[] = [start];
    const f = new Float32Array(cols * rows).fill(Infinity);
    const h = (i: number) => Math.hypot((i % cols) - g[0], Math.floor(i / cols) - g[1]);
    gScore[start] = 0;
    f[start] = h(start);
    const closed = new Uint8Array(cols * rows);
    while (open.length) {
      let bi = 0;
      for (let k = 1; k < open.length; k++) if (f[open[k]] < f[open[bi]]) bi = k;
      const cur = open.splice(bi, 1)[0];
      if (cur === goal) break;
      closed[cur] = 1;
      const cc = cur % cols, cr = Math.floor(cur / cols);
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) {
          if (!dr && !dc) continue;
          const nc = cc + dc, nr = cr + dr;
          if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
          const n = nr * cols + nc;
          if (!walkable[n] || closed[n]) continue;
          // 대각선으로 모서리를 파고들지 않게
          if (dr && dc && (!walkable[cr * cols + nc] || !walkable[nr * cols + cc])) continue;
          const t = gScore[cur] + (dr && dc ? Math.SQRT2 : 1);
          if (t < gScore[n]) {
            gScore[n] = t;
            f[n] = t + h(n);
            came[n] = cur;
            if (!open.includes(n)) open.push(n);
          }
        }
    }
    if (came[goal] === -1 && goal !== start) return [];
    const pts: Pt[] = [];
    for (let i = goal; i !== -1; i = came[i]) pts.unshift({ x: (i % cols) * CELL, y: Math.floor(i / cols) * CELL });
    // 목표가 걸을 수 있는 곳이면 정확한 지점으로 마무리
    if (free(to.x, to.y)) pts.push(to);
    return simplify(pts, free);
  };

  return { free, step, path };
}

// 직선으로 갈 수 있는 중간 점은 건너뛰어 부드러운 경로로
function simplify(pts: Pt[], free: (x: number, y: number) => boolean): Pt[] {
  if (pts.length < 3) return pts;
  const out: Pt[] = [pts[0]];
  let anchor = pts[0];
  for (let i = 2; i < pts.length; i++) {
    if (!lineFree(anchor, pts[i], free)) {
      anchor = pts[i - 1];
      out.push(anchor);
    }
  }
  out.push(pts[pts.length - 1]);
  return out.slice(1);
}

function lineFree(a: Pt, b: Pt, free: (x: number, y: number) => boolean) {
  const n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 6);
  for (let i = 1; i < n; i++) if (!free(a.x + ((b.x - a.x) * i) / n, a.y + ((b.y - a.y) * i) / n)) return false;
  return true;
}
