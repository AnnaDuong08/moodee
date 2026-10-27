// 에셋 존재 여부 확인 훅: 로드 실패 시 플레이스홀더로 대체하기 위함
import { useEffect, useState } from 'react';

type Status = 'loading' | 'ok' | 'error';
const cache = new Map<string, Status>();

export function useImageOk(src: string): Status {
  const [status, setStatus] = useState<Status>(() => cache.get(src) ?? 'loading');

  useEffect(() => {
    const cached = cache.get(src);
    if (cached && cached !== 'loading') {
      setStatus(cached);
      return;
    }
    let alive = true;
    const img = new Image();
    img.onload = () => {
      cache.set(src, 'ok');
      if (alive) setStatus('ok');
    };
    img.onerror = () => {
      cache.set(src, 'error');
      if (alive) setStatus('error');
    };
    img.src = src;
    return () => {
      alive = false;
    };
  }, [src]);

  return status;
}
