// Subscribe to soundscape settings as React state
import { useEffect, useState } from 'react';
import { soundscape, type AudioSettings } from './soundscape';

export function useSoundscape() {
  const [settings, setSettings] = useState<AudioSettings>(soundscape.settings);
  const [playing, setPlaying] = useState(soundscape.playing);

  useEffect(() => soundscape.subscribe(setSettings), []);

  const start = async () => {
    await soundscape.start();
    setPlaying(true);
  };
  const stop = () => {
    soundscape.stop();
    setPlaying(false);
  };

  return { settings, playing, start, stop, engine: soundscape };
}
