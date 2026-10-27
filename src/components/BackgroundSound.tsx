import { useSyncExternalStore } from 'react';
import { roomAudio, ROOM_TRACKS } from '../audio/roomAudio';
import { MuteIcon, SoundIcon } from './Icons';
import { Sheet } from './Sheet';
import styles from './BackgroundSound.module.css';

export function BackgroundSoundButton({ onClick, dark = false }: { onClick: () => void; dark?: boolean }) {
  const state = useSyncExternalStore(roomAudio.subscribe, roomAudio.getSnapshot);
  const silent = state.muted || state.volume === 0 || state.status !== 'playing';
  return <button type="button" className={`${styles.button} ${dark ? styles.dark : ''}`} onClick={onClick} aria-label="Background sound settings" aria-haspopup="dialog">
    {silent ? <MuteIcon /> : <SoundIcon />}
  </button>;
}

export function BackgroundSoundPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const state = useSyncExternalStore(roomAudio.subscribe, roomAudio.getSnapshot);
  const silent = state.muted || state.volume === 0;
  const turnOn = () => {
    if (state.volume === 0) roomAudio.setVolume(.35);
    roomAudio.setMuted(false);
    void roomAudio.unlock();
  };
  return <div className={styles.layer} style={{ pointerEvents: open ? 'auto' : 'none' }}>
    <Sheet open={open} onClose={onClose} title="Background sound" subtitle={state.place ? ROOM_TRACKS[state.place].label : undefined}
      action={<button type="button" className={styles.close} onClick={onClose} aria-label="Close sound settings">×</button>}>
      <div className={styles.content}>
        <label className={styles.label} htmlFor="background-volume">Volume <span>{Math.round(state.volume * 100)}%</span></label>
        <input id="background-volume" className={styles.slider} type="range" min="0" max="100" value={Math.round(state.volume * 100)} onChange={event => roomAudio.setVolume(Number(event.target.value) / 100)} />
        <button type="button" className="pill pill-primary" onClick={state.status === 'error' || silent || state.status === 'locked' ? turnOn : () => roomAudio.setMuted(true)}>
          {state.status === 'error' ? 'Retry sound' : silent || state.status === 'locked' ? 'Turn on sound' : 'Mute sound'}
        </button>
        {state.status === 'loading' && <p role="status">Loading sound…</p>}
        {state.status === 'error' && <p role="status">Sound unavailable. Check your connection and try again.</p>}
      </div>
    </Sheet>
  </div>;
}
