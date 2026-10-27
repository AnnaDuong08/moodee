// Museum — Collect / Reflect
// 탑뷰 전시장에서 걸어 다니며 내 기억 전시대를 보고, 입구 앞 카메라 지점에서 새 기억을 찍어 전시대에 올린다
import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { BackgroundSoundButton } from '../components/BackgroundSound';
import { BackIcon, PeopleIcon } from '../components/Icons';
import { EXHIBIT_OBJECTS, type ExhibitObjectId } from '../config/economy';
import { getCharacter, PLAYABLE, type CharacterId } from '../data/characters';
import type { Rect } from '../data/places';
import { listMemories, type Memory } from '../lib/memories';
import { screenMotion } from '../lib/motion';
import { MemoryCamera } from '../world/MemoryCamera';
import { WorldScene, type WorldConfig, type WorldNpc, type Zone } from '../world/WorldScene';
import hud from '../world/space.module.css';
import styles from './MuseumScreen.module.css';

const base = import.meta.env.BASE_URL;

// 내 기억 전시대 3곳(새 기억이 가운데에 놓이고 이전 것은 옆으로) + 기본 전시 2곳
const MY_STANDS = [{ x: 468, y: 1000 }, { x: 330, y: 1030 }, { x: 606, y: 1030 }];
const DEMO_STANDS = [{ x: 320, y: 880 }, { x: 620, y: 880 }];
const standBlock = (s: { x: number; y: number }): Rect => [s.x - 34, s.y - 24, s.x + 34, s.y + 14];

// 좌표는 박물관 탑뷰 이미지(941×1672) 픽셀 기준
const MUSEUM: WorldConfig = {
  id: 'museum',
  src: `${base}assets/places/museum-topdown-portrait.jpg`,
  alt: 'Museum hall seen from above',
  width: 941,
  height: 1672,
  bounds: [90, 335, 855, 1166],
  blockers: [
    [307, 340, 391, 430], [573, 335, 654, 427], [263, 464, 360, 573], [608, 452, 701, 562], // 위쪽 전시대 넷
    [420, 418, 544, 470], // 벤치
    [420, 571, 525, 692], [199, 660, 320, 785], [631, 640, 746, 770], [395, 782, 541, 922], // 흉상, 항아리, 말, 책
    [165, 794, 240, 918], [700, 794, 774, 918], // 양옆 벤치
    [58, 978, 213, 1141], [720, 978, 867, 1141], // 아래쪽 큰 전시대 둘
    [0, 326, 150, 880], [800, 326, 941, 900], // 벽 쪽 전시
    ...MY_STANDS.map(standBlock), ...DEMO_STANDS.map(standBlock),
  ],
  start: { x: 468, y: 1136 },
  exit: { x: 468, y: 1162 },
  charH: 0.13,
  zoom: 1.2,
  waypoints: [{ x: 392, y: 520 }, { x: 565, y: 520 }, { x: 392, y: 740 }, { x: 578, y: 740 }, { x: 270, y: 945 }, { x: 670, y: 945 }, { x: 400, y: 1095 }, { x: 545, y: 1095 }],
};

// 처음부터 전시되어 있는 기억(데모)
const DEMO_MEMORIES: Memory[] = [
  { id: 'demo-1', moment: 'Late-night Hackathon', objectId: 'team-whiteboard', story: 'We stayed up building MOODEE together.', createdAt: '2026-09-30T13:00:00.000Z' },
  { id: 'demo-2', moment: 'Lucky duck sock', objectId: 'duck-sock', story: 'Wore it to every pitch. It has not failed us yet.', createdAt: '2026-09-29T09:00:00.000Z' },
];

const MUSEUM_LINES = [
  'this one looks so real', 'i like the little duck sock', '(quietly) the light in here is beautiful', 'someone kept a whiteboard. love that', 'taking my time today',
  'what would you put on a pedestal?', 'the hall echoes a bit', 'i want to remember today too', 'every object has a tiny story', 'just looking around',
];
const MUSEUM_REPLIES = ['ooh, show me', 'that is a nice memory', 'mm, same', 'hi :)', 'i saw that one too', 'keep it, it matters', 'lovely'];

const day = (iso: string) => new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
const img = (id: string) => EXHIBIT_OBJECTS[id as ExhibitObjectId]?.img;

interface Props {
  characterId: CharacterId | null;
  onBack: () => void;
  onSoundSettings: () => void;
}

export function MuseumScreen({ characterId, onBack, onSoundSettings }: Props) {
  const character = getCharacter(characterId);
  const [memories, setMemories] = useState<Memory[]>(listMemories);
  const [camera, setCamera] = useState(false);
  const [viewing, setViewing] = useState<Memory | null>(null);
  const [fresh, setFresh] = useState<string | null>(null); // 방금 전시한 기억(등장 연출)
  const [toast, setToast] = useState<string | null>(null);

  // 전시대 ↔ 기억: 내 기억은 최신 3개, 나머지는 기본 전시
  const stands = useMemo(
    () => [
      ...MY_STANDS.map((s, i) => ({ ...s, id: `my-${i}`, memory: memories[i] as Memory | undefined, mine: true })),
      ...DEMO_STANDS.map((s, i) => ({ ...s, id: `demo-${i}`, memory: DEMO_MEMORIES[i] as Memory | undefined, mine: false })),
    ],
    [memories],
  );
  const zones = useMemo<Zone[]>(
    () => [
      { id: 'camera', kind: 'camera', x: 468, y: 1098, label: 'Capture a memory', radius: 46 },
      ...stands.filter((s) => s.memory).map((s) => ({ id: s.id, kind: 'stand', x: s.x, y: s.y + 44, label: 'View memory', radius: 52 })),
    ],
    [stands],
  );
  const npcs = useMemo<WorldNpc[]>(() => {
    const looks = PLAYABLE.filter((c) => c.id !== character.id);
    return [{ id: 'v1', name: 'Ari', character: looks[0] }, { id: 'v2', name: 'Bo', character: looks[2] }];
  }, [character.id]);
  const chatter = useMemo(() => ({ place: 'the museum', speakers: [{ id: 'v1', name: 'Ari' }, { id: 'v2', name: 'Bo' }], lines: MUSEUM_LINES, replies: MUSEUM_REPLIES }), []);

  const act = (z: Zone) => {
    if (z.kind === 'camera') setCamera(true);
    else setViewing(stands.find((s) => s.id === z.id)?.memory ?? null);
  };

  const saved = (m: Memory) => {
    setMemories(listMemories());
    setCamera(false);
    setFresh(m.id);
    setToast('Added to your Museum');
    window.setTimeout(() => setToast(null), 2600);
    window.setTimeout(() => setFresh(null), 3000);
  };

  const busy = camera || !!viewing;

  return (
    <motion.main className={`screen ${hud.space}`} {...screenMotion}>
      <motion.div className={hud.layer} animate={camera ? { scale: 1.3, opacity: 0 } : { scale: 1, opacity: 1 }} transition={{ duration: 0.6, ease: [0.45, 0, 0.2, 1] }}>
        <WorldScene
          config={MUSEUM}
          character={character}
          zones={zones}
          npcs={npcs}
          paused={busy}
          onAct={act}
          onExit={onBack}
          chatter={chatter}
          hint={memories.length ? { title: 'Your memories are on display', text: 'Walk up to a stand to read it, or capture a new one.' } : { title: 'Keep a moment', text: 'Step onto the camera mark to turn a real moment into an object.' }}
        >
          {/* 카메라 지점 표시 */}
          <span className={styles.cameraMark} style={{ left: 468, top: 1098 }} aria-hidden>
            📷
          </span>
          {stands.map((s) => (
            <div key={s.id} className={styles.stand} style={{ left: s.x, top: s.y, zIndex: Math.round(s.y) }}>
              <span className={styles.box} />
              {s.memory ? (
                <motion.img
                  key={s.memory.id}
                  src={img(s.memory.objectId)}
                  alt={s.memory.moment}
                  draggable={false}
                  initial={s.memory.id === fresh ? { opacity: 0, scale: 0.6, y: -40 } : false}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 180, damping: 14, delay: 0.5 }}
                />
              ) : (
                <span className={styles.emptyStand}>＋</span>
              )}
              {s.memory && s.mine && <span className={styles.plate}>{s.memory.moment}</span>}
            </div>
          ))}
        </WorldScene>
      </motion.div>

      <header className={hud.top}>
        <button type="button" className={hud.glassBtn} onClick={onBack} aria-label="Leave the museum">
          <BackIcon />
        </button>
        <span className={hud.chip}>Museum</span>
        <div className={hud.topActions}>
          <span className={hud.count} aria-label={`${npcs.length + 1} people here`}>
            <PeopleIcon /> {npcs.length + 1}
          </span>
          <BackgroundSoundButton dark onClick={onSoundSettings} />
        </div>
      </header>

      <AnimatePresence>
        {toast && (
          <motion.p key={toast} className={hud.toast} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {toast}
          </motion.p>
        )}
      </AnimatePresence>

      {/* 전시물 보기: 오브젝트를 크게, 이름·날짜·이야기 */}
      <AnimatePresence>
        {viewing && (
          <motion.div className={styles.backdrop} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setViewing(null)}>
            <motion.article className={styles.card} role="dialog" aria-modal="true" aria-label={viewing.moment} initial={{ scale: 0.85, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 22 }} onClick={(e) => e.stopPropagation()}>
              <div className={styles.spot}>
                <motion.img src={img(viewing.objectId)} alt="" animate={{ y: [0, -6, 0], rotate: [0, 1.5, 0] }} transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }} />
              </div>
              <h2>{viewing.moment}</h2>
              <time>{day(viewing.createdAt)}</time>
              <p>{viewing.story ? `“${viewing.story}”` : 'No story written yet — the object remembers for you.'}</p>
              <button type="button" className="pill pill-soft" onClick={() => setViewing(null)}>
                Close
              </button>
            </motion.article>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>{camera && <MemoryCamera onClose={() => setCamera(false)} onSaved={saved} />}</AnimatePresence>
    </motion.main>
  );
}
