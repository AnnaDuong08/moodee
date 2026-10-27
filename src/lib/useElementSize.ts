// 요소 크기 추적(카메라 계산용)
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

// 이미지(W×H)를 화면(vw×vh)에 cover로 깔고 zoom배 확대한 뒤,
// 이미지 좌표(fx, fy)가 화면 좌표(tx, ty)에 오도록 이동(가장자리 밖은 보이지 않게 제한)
export function camera(vw: number, vh: number, W: number, H: number, zoom: number, fx: number, fy: number, tx = vw / 2, ty = vh / 2) {
  const s = Math.max(vw / W, vh / H) * zoom;
  const clamp = (v: number, min: number) => Math.min(0, Math.max(min, v));
  return { s, x: clamp(tx - fx * s, vw - W * s), y: clamp(ty - fy * s, vh - H * s) };
}
