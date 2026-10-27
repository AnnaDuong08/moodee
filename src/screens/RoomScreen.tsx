// My Room — Personalize
// 탑뷰 방 안을 걸어 다니며 책상·선반·탁자에 모은 것들을 올려놓고, 옷장에서 Cloudee를 꾸민다
import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { CoinChip } from '../components/Coin';
import { BackgroundSoundButton } from '../components/BackgroundSound';
import { BackIcon } from '../components/Icons';
import { Sheet } from '../components/Sheet';
import { EXHIBIT_OBJECTS, type ExhibitObjectId } from '../config/economy';
import { getCharacter, type CharacterId } from '../data/characters';
import { listMemories } from '../lib/memories';
import { screenMotion } from '../lib/motion';
import { monthStudyDays } from '../lib/sessions';
import { placeInRoom, useWallet } from '../lib/wallet';
import { WorldScene, type WorldConfig, type Zone } from '../world/WorldScene';
import hud from '../world/space.module.css';
import { RoomPanel } from './places/panels';
import styles from './RoomScreen.module.css';

const base = import.meta.env.BASE_URL;

// 좌표는 방 탑뷰 이미지(941×1672) 픽셀 기준
const ROOM: WorldConfig = {
  id: 'my-room',
  src: `${base}assets/places/myroom-topdown.jpg`,
  alt: 'My room seen from above',
  width: 941,
  height: 1672,
  bounds: [150, 425, 822, 1398],
  blockers: [
    [107, 262, 513, 420], [285, 420, 385, 500], // 책상, 의자
    [478, 239, 860, 790], [786, 760, 880, 872], // 침대, 협탁
    [0, 454, 162, 912], [118, 470, 215, 562], // 왼쪽 책장, 화분
    [84, 895, 346, 1172], [375, 920, 568, 1124], [590, 1039, 728, 1172], // 안락의자, 둥근 탁자, 푸프
    [0, 1122, 228, 1410], [824, 597, 941, 1196], [716, 1218, 941, 1433], // 턴테이블 장, 오른쪽 책장, 수납장
  ],
  start: { x: 483, y: 1335 },
  exit: { x: 483, y: 1394 },
  charH: 0.155,
  zoom: 1.15,
  waypoints: [],
};

// 물건을 올려놓을 수 있는 자리: 서는 위치(zone)와 물건이 놓이는 위치(at)
const SLOTS = [
  { id: 'desk', name: 'Desk', zone: { x: 225, y: 445 }, at: { x: 205, y: 352 }, size: 78 },
  { id: 'shelf', name: 'Bookshelf', zone: { x: 188, y: 760 }, at: { x: 84, y: 730 }, size: 70 },
  { id: 'table', name: 'Coffee table', zone: { x: 602, y: 992 }, at: { x: 430, y: 1010 }, size: 84 },
  { id: 'bedside', name: 'Bedside table', zone: { x: 760, y: 895 }, at: { x: 832, y: 800 }, size: 66 },
];

interface Props {
  characterId: CharacterId | null;
  onBack: () => void;
  onSoundSettings: () => void;
  onMembership: () => void;
  onChangeCharacter: (id: CharacterId) => void;
}

export function RoomScreen({ characterId, onBack, onMembership, onChangeCharacter, onSoundSettings }: Props) {
  const character = getCharacter(characterId);
  const wallet = useWallet();
  const [slot, setSlot] = useState<(typeof SLOTS)[number] | null>(null);
  const [wardrobe, setWardrobe] = useState(false);
  const [justPlaced, setJustPlaced] = useState<string | null>(null);

  // 가진 것: Museum에서 만든 기억 오브젝트(memoryId로 연결) + 처음부터 있는 소품 둘
  const collection = useMemo(() => {
    const mine = listMemories().map((m) => ({ key: m.id, objectId: m.objectId as ExhibitObjectId, label: m.moment, memoryId: m.id as string | undefined }));
    const starters = (['duck-sock', 'banana-milk'] as ExhibitObjectId[]).filter((id) => !mine.some((m) => m.objectId === id)).map((id) => ({ key: id, objectId: id, label: EXHIBIT_OBJECTS[id].name, memoryId: undefined as string | undefined }));
    return [...mine.filter((m, i, all) => all.findIndex((x) => x.objectId === m.objectId) === i), ...starters];
  }, [slot]);

  const zones = useMemo<Zone[]>(
    () => [
      ...SLOTS.map((s) => ({ id: s.id, kind: 'slot', ...s.zone, label: wallet.room[s.id] ? `Change · ${s.name}` : `Place · ${s.name}`, radius: 58 })),
      { id: 'wardrobe', kind: 'wardrobe', x: 690, y: 1240, label: 'Open wardrobe', radius: 60 },
    ],
    [wallet.room],
  );

  const put = (objectId: string | null) => {
    if (!slot) return;
    placeInRoom(slot.id, objectId);
    setJustPlaced(objectId ? slot.id : null);
    setSlot(null);
    window.setTimeout(() => setJustPlaced(null), 1200);
  };

  return (
    <motion.main className={`screen ${hud.space}`} {...screenMotion}>
      <div className={hud.layer}>
        <WorldScene
          config={ROOM}
          character={character}
          zones={zones}
          npcs={[]}
          paused={!!slot || wardrobe}
          onAct={(z) => (z.kind === 'wardrobe' ? setWardrobe(true) : setSlot(SLOTS.find((s) => s.id === z.id) ?? null))}
          onExit={onBack}
          exitLabel="Door"
          hint={{ title: 'Your own space', text: 'Walk to a glowing spot to place something you collected.' }}
        >
          {SLOTS.map((s) => {
            const id = wallet.room[s.id] as ExhibitObjectId | undefined;
            const obj = id && EXHIBIT_OBJECTS[id];
            return obj ? (
              <motion.img
                key={`${s.id}-${id}`}
                className={styles.placed}
                src={obj.img}
                alt={obj.name}
                draggable={false}
                style={{ left: s.at.x, top: s.at.y, width: s.size }}
                initial={justPlaced === s.id ? { scale: 0.4, opacity: 0, y: -30 } : false}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 220, damping: 14 }}
              />
            ) : null;
          })}
        </WorldScene>
      </div>

      <header className={hud.top}>
        <button type="button" className={hud.glassBtn} onClick={onBack} aria-label="Leave my room">
          <BackIcon />
        </button>
        <span className={hud.chip}>My Room</span>
        <div className={hud.topActions}><CoinChip onClick={onMembership} /><BackgroundSoundButton dark onClick={onSoundSettings} /></div>
      </header>

      {/* 물건 고르기 */}
      <Sheet open={!!slot} onClose={() => setSlot(null)} title={slot ? `On the ${slot.name.toLowerCase()}` : ''} subtitle="Things you collected. Memories from the Museum show up here.">
        <div className={styles.grid}>
          {collection.map((c) => (
            <button key={c.key} type="button" className={slot && wallet.room[slot.id] === c.objectId ? styles.on : ''} onClick={() => put(c.objectId)} aria-label={`Place ${c.label}`}>
              <img src={EXHIBIT_OBJECTS[c.objectId].img} alt="" />
              <small>{c.label}</small>
            </button>
          ))}
        </div>
        {slot && wallet.room[slot.id] && (
          <button type="button" className="pill pill-soft" style={{ width: '100%', minHeight: 50, marginTop: 10 }} onClick={() => put(null)}>
            Clear this spot
          </button>
        )}
      </Sheet>

      <Sheet open={wardrobe} onClose={() => setWardrobe(false)} title="Wardrobe" subtitle="Dress your Cloudee with what you earned.">
        <RoomPanel me={character} onChangeCharacter={onChangeCharacter} monthDays={monthStudyDays()} wardrobeOnly />
      </Sheet>

      <AnimatePresence>
        {justPlaced && (
          <motion.p className={hud.toast} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            Feels a little more like yours
          </motion.p>
        )}
      </AnimatePresence>
    </motion.main>
  );
}
