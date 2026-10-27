import { useEffect } from 'react';
import { roomAudio } from './roomAudio';

export function useRoomAudio(screen: string) {
  useEffect(() => {
    const unlock = () => { void roomAudio.unlock(); };
    const visibility = () => roomAudio.setHidden(document.hidden);
    const hide = () => roomAudio.setHidden(true);
    window.addEventListener('pointerdown', unlock, true);
    window.addEventListener('keydown', unlock, true);
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pagehide', hide);
    window.addEventListener('pageshow', visibility);
    visibility();
    return () => {
      window.removeEventListener('pointerdown', unlock, true);
      window.removeEventListener('keydown', unlock, true);
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('pagehide', hide);
      window.removeEventListener('pageshow', visibility);
      roomAudio.dispose();
    };
  }, []);
  useEffect(() => roomAudio.move(screen), [screen]);
}
