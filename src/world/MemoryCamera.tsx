// Museum camera: real moment → click → photo → memory icon → memory object → name & story → exhibit
// Prototype transformation using prepared assets: not real AI 3D generation, but prepared photo and object assets chained together with motion
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { Sparkles } from '../components/Coin';
import { CAMERA_SCENES, EXHIBIT_OBJECTS, type ExhibitObjectId } from '../config/economy';
import { addMemory, type Memory } from '../lib/memories';
import { shutterSound } from '../screens/places/panels';
import styles from './MemoryCamera.module.css';

const base = import.meta.env.BASE_URL;

interface Scene {
  id: string;
  label: string;
  object: ExhibitObjectId;
  photo?: string;
  video?: string;
}
// The first shot is the provided demo video (screen recording of a phone camera pointed at the hackathon banner)
const SCENES: Scene[] = [
  { id: 'demo-video', label: 'Hackathon banner · demo video', video: `${base}assets/museum/demo-capture.mp4`, object: 'hackathon-banner' },
  ...CAMERA_SCENES.filter((s) => s.id !== 'hackathon-banner'),
];

type Step = 'connecting' | 'aim' | 'flash' | 'photo' | 'icon' | 'object' | 'form';
const STEP_LABEL: Partial<Record<Step, [string, string]>> = {
  photo: ['STEP 1', 'Real moment'],
  icon: ['STEP 2', 'Memory icon'],
  object: ['STEP 3', 'Memory object'],
  form: ['STEP 3', 'Memory object'],
};

export function MemoryCamera({ onClose, onSaved }: { onClose: () => void; onSaved: (m: Memory) => void }) {
  const [scene, setScene] = useState(SCENES[0]);
  const [step, setStep] = useState<Step>('connecting');
  const [live, setLive] = useState<MediaStream | null>(null); // Real camera (only when permitted)
  const [note, setNote] = useState<string | null>(null);
  const [still, setStill] = useState<string | null>(null); // Captured scene
  const [title, setTitle] = useState('');
  const [story, setStory] = useState('');
  const video = useRef<HTMLVideoElement>(null);
  const timers = useRef<number[]>([]);
  const object = EXHIBIT_OBJECTS[scene.object];

  // Connecting camera… → Camera connected
  useEffect(() => {
    const t = window.setTimeout(() => setStep('aim'), 1100);
    return () => {
      clearTimeout(t);
      timers.current.forEach(clearTimeout);
    };
  }, []);
  useEffect(() => () => live?.getTracks().forEach((t) => t.stop()), [live]);
  useEffect(() => {
    if (video.current && live) video.current.srcObject = live;
  }, [live]);

  // Only try the real camera when the user taps, and continue with the demo video if it fails
  const useMyCamera = async () => {
    if (live) {
      setLive(null);
      return;
    }
    try {
      setLive(await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }));
    } catch {
      setNote('Camera not available — using the demo moment');
      window.setTimeout(() => setNote(null), 2400);
    }
  };

  const toObject = () => {
    timers.current.forEach(clearTimeout);
    setStep('form');
  };

  const shoot = () => {
    if (step !== 'aim') return;
    shutterSound();
    // Video or camera: freeze that moment into a single frame
    const v = video.current;
    if (v && (live || scene.video)) {
      v.pause();
      try {
        const c = document.createElement('canvas');
        c.width = v.videoWidth || 720;
        c.height = v.videoHeight || 1280;
        c.getContext('2d')!.drawImage(v, 0, 0, c.width, c.height);
        setStill(c.toDataURL('image/jpeg', 0.8));
      } catch {
        setStill(null);
      }
    } else setStill(scene.photo ?? null);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setStep('flash');
    timers.current = [
      window.setTimeout(() => setStep('photo'), 350),
      window.setTimeout(() => setStep('icon'), reduce ? 900 : 1500),
      window.setTimeout(() => setStep('object'), reduce ? 1500 : 2700),
      window.setTimeout(() => setStep('form'), reduce ? 2000 : 3700),
    ];
  };

  const save = () => onSaved(addMemory({ moment: title.trim() || object.name, story: story.trim(), objectId: scene.object, photo: scene.photo, sourceType: live ? 'camera' : scene.video ? 'demo-video' : 'photo' }));

  const aiming = step === 'connecting' || step === 'aim' || step === 'flash';
  const label = STEP_LABEL[step];
  const showVideo = live || scene.video;

  return (
    <motion.div className={styles.camera} role="dialog" aria-modal="true" aria-label="Capture a memory" initial={{ opacity: 0, scale: 1.08 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
      <div className={styles.top}>
        <button type="button" className={styles.round} onClick={onClose} aria-label="Back to the museum">
          ×
        </button>
        <span className={styles.status} data-on={step !== 'connecting'}>
          <i /> {step === 'connecting' ? 'Connecting camera…' : aiming ? (live ? 'Camera connected · live' : 'Camera connected') : 'Memory object created'}
        </span>
        {aiming ? (
          <button type="button" className={`${styles.round} ${live ? styles.roundOn : ''}`} onClick={useMyCamera} aria-pressed={!!live} aria-label={live ? 'Back to the demo moment' : 'Use my camera'}>
            ⟳
          </button>
        ) : (
          <span className={styles.round} style={{ visibility: 'hidden' }} />
        )}
      </div>

      <div className={styles.viewfinder}>
        {/* Scene shown in the camera */}
        {aiming && (
          <>
            {showVideo ? (
              <video ref={video} key={live ? 'live' : scene.id} className={live ? styles.shot : `${styles.shot} ${styles.recording}`} src={live ? undefined : scene.video} autoPlay muted loop playsInline />
            ) : (
              <img key={scene.id} className={styles.shot} src={scene.photo} alt={scene.label} />
            )}
            <i className={`${styles.corner} ${styles.tl}`} />
            <i className={`${styles.corner} ${styles.tr}`} />
            <i className={`${styles.corner} ${styles.bl}`} />
            <i className={`${styles.corner} ${styles.br}`} />
          </>
        )}

        {/* Transformation: photo → icon (silhouette) → object */}
        {!aiming && (
          <div className={styles.transform}>
            <AnimatePresence>
              {step === 'photo' && (
                <motion.div key="photo" className={`${styles.photo} ${still && scene.video && !live ? styles.photoRec : ''}`} initial={{ scale: 1.25, rotate: 0 }} animate={{ scale: 1, rotate: -3 }} exit={{ scale: 0.5, opacity: 0 }} transition={{ duration: 0.5 }}>
                  {still ? <img src={still} alt="The captured moment" /> : null}
                </motion.div>
              )}
            </AnimatePresence>
            {step !== 'photo' && (
              <>
                <motion.span className={styles.pedestal} initial={{ opacity: 0, scaleX: 0.6 }} animate={{ opacity: step === 'icon' ? 0 : 1, scaleX: 1 }} transition={{ duration: 0.6 }} />
                <motion.img
                  key="object"
                  className={styles.object}
                  src={object.img}
                  alt={object.name}
                  initial={{ scale: 0.55, opacity: 0, rotate: -8 }}
                  animate={{ scale: step === 'icon' ? 0.72 : 1, opacity: 1, rotate: step === 'icon' ? [-6, 6, 0] : 0, filter: step === 'icon' ? 'brightness(0) invert(1) drop-shadow(0 0 0 #fff)' : 'brightness(1) invert(0) drop-shadow(0 22px 20px rgba(60,30,20,0.4))' }}
                  transition={{ duration: 0.7 }}
                />
                {(step === 'object' || step === 'form') && <Sparkles count={10} />}
              </>
            )}
          </div>
        )}

        {label && (
          <motion.p key={label[1]} className={styles.stepLabel} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <small>{label[0]}</small>
            {label[1]}
          </motion.p>
        )}
        <AnimatePresence>{step === 'flash' && <motion.span className={styles.flash} initial={{ opacity: 1 }} animate={{ opacity: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }} />}</AnimatePresence>
        {(step === 'photo' || step === 'icon' || step === 'object') && (
          <button type="button" className={styles.skip} onClick={toObject}>
            Skip
          </button>
        )}
      </div>

      {step === 'form' ? (
        <motion.div className={styles.bottom} initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <label>
            <span>Give this memory a name</span>
            <input value={title} maxLength={40} placeholder={object.name} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label>
            <span>What do you want to remember?</span>
            <textarea value={story} maxLength={140} rows={2} placeholder="We stayed up building MOODEE together." onChange={(e) => setStory(e.target.value)} />
          </label>
          <button type="button" className="pill pill-primary" onClick={save}>
            Save to my Museum
          </button>
        </motion.div>
      ) : (
        <div className={styles.bottom}>
          <ul className={styles.roll} aria-label="What is in front of the camera">
            {SCENES.map((s) => (
              <li key={s.id}>
                <button type="button" className={scene.id === s.id ? styles.rollOn : ''} onClick={() => step === 'aim' && setScene(s)} aria-label={s.label} aria-pressed={scene.id === s.id} disabled={!aiming}>
                  {s.video ? <span className={styles.play}>▶</span> : <img src={s.photo} alt="" />}
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className={styles.shutter} onClick={shoot} disabled={step !== 'aim'} aria-label="Capture">
            <span />
          </button>
          <p className={styles.hint}>{note ?? (live ? `Live camera · becomes “${object.name}”` : scene.label)}</p>
        </div>
      )}
    </motion.div>
  );
}
