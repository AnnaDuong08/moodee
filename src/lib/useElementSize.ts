// Track element size (for camera calculations)
import { useEffect, useState, type RefObject } from 'react';

export function useElementSize(ref: RefObject<HTMLElement | null>) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

// Lay the image (W×H) over the screen (vw×vh) with cover and zoom it by `zoom`,
// then translate so image coordinates (fx, fy) land at screen coordinates (tx, ty) (clamped so nothing outside the edges shows)
export function camera(vw: number, vh: number, W: number, H: number, zoom: number, fx: number, fy: number, tx = vw / 2, ty = vh / 2) {
  const s = Math.max(vw / W, vh / H) * zoom;
  const clamp = (v: number, min: number) => Math.min(0, Math.max(min, v));
  return { s, x: clamp(tx - fx * s, vw - W * s), y: clamp(ty - fy * s, vh - H * s) };
}
