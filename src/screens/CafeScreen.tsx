// Café — Social / Connect
// 탑뷰에서 걸어 다니다가 카운터에서 음료를 만들고(컵에 차오름), 빈 의자에 앉으면 테이블 위에 그 음료가 놓인다
import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { CharacterSprite } from '../components/CharacterSprite';
import { Sparkles } from '../components/Coin';
import { BoardCafe } from '../boardcafe/BoardCafe';
import { BackgroundSoundButton } from '../components/BackgroundSound';
import { BackIcon, PeopleIcon } from '../components/Icons';
import { getCharacter, PLAYABLE, type CharacterId } from '../data/characters';
import { getCompanions } from '../lib/companions';
import { screenMotion } from '../lib/motion';
import { loadValue, save } from '../lib/storage';
import { DrinkGlass, drinkLayers, INGREDIENTS, ingredient, levelOf, MAX_LEVEL, mix, type CafeDrink } from '../world/DrinkGlass';
import { FriendsSheet } from '../world/FriendsSheet';
import { WorldScene, type WorldConfig, type WorldNpc, type Zone } from '../world/WorldScene';
import hud from '../world/space.module.css';
import styles from './CafeScreen.module.css';

const base = import.meta.env.BASE_URL;

// 좌표는 카페 탑뷰 이미지(941×1672) 픽셀 기준
const CAFE: WorldConfig = {
  id: 'cafe',
  src: `${base}assets/places/cafe-topdown.jpg`,
  alt: 'Café seen from above',
  width: 941,
  height: 1672,
  bounds: [95, 440, 850, 1390],
  // 테이블 상판(의자는 지나갈 수 있음)
  blockers: [
    [205, 455, 345, 550], [185, 675, 340, 780], [160, 945, 315, 1060],
    [645, 465, 770, 580], [660, 690, 795, 810], [665, 950, 810, 1080],
  ],
  start: { x: 468, y: 1325 },
  exit: { x: 468, y: 1388 },
  charH: 0.16,
  zoom: 1.2,
  waypoints: [{ x: 455, y: 470 }, { x: 560, y: 600 }, { x: 470, y: 760 }, { x: 480, y: 900 }, { x: 470, y: 1120 }, { x: 560, y: 1250 }, { x: 380, y: 1290 }],
};

const ZONES: Zone[] = [
  { id: 'counter', kind: 'counter', x: 455, y: 452, label: 'Make a drink', radius: 84 },
  { id: 's1', kind: 'seat', x: 180, y: 522, label: 'Sit here' },
  { id: 's2', kind: 'seat', x: 270, y: 610, label: 'Sit here' },
  { id: 's3', kind: 'seat', x: 368, y: 750, label: 'Sit here' },
  { id: 's4', kind: 'seat', x: 340, y: 1035, label: 'Sit here' },
  { id: 's5', kind: 'seat', x: 632, y: 748, label: 'Sit here' },
  { id: 's6', kind: 'seat', x: 650, y: 1012, label: 'Sit here' },
];

// 분위기용 손님(친구와는 구분): 둘이 마주 앉은 테이블, 혼자 앉은 테이블
const AMBIENT = [
  { id: 'a1', name: 'Mina', at: { x: 628, y: 528 }, pose: 'sideAlt' as const },
  { id: 'a2', name: 'Jun', at: { x: 792, y: 520 }, pose: 'side' as const },
  { id: 'a3', name: 'Theo', at: { x: 132, y: 1040 }, pose: 'sideAlt' as const },
];

// 카페 잡담(무작위). 실제 사람이 있는 것처럼 가볍고 짧게
const CAFE_LINES = [
  'this latte is so good', 'anyone tried the matcha?', 'the croissants just came out!!', 'brb getting a refill', 'it smells amazing in here',
  'finally done with my essay', 'who wants to share a table?', 'the sunlight by the window is perfect', 'lol same', 'strawberry milk > everything',
  'taking a 10 min break', 'studying later, coffee first', 'this playlist is nice', 'so cozy today', 'save me a seat!',
  'i think i added too much syrup haha', 'going to the library after this', 'what are you all drinking?',
];
const CAFE_REPLIES = ['haha true', 'ooh nice', 'same!!', 'come sit with us :)', 'good idea', 'totally', 'hi hi!', 'what did you make?', 'try the honey one next', 'lol', 'that sounds good', 'welcome~'];

type Mode = 'top' | 'maker' | 'table';

interface Props {
  characterId: CharacterId | null;
  onBack: () => void;
  onSoundSettings: () => void;
  onChangeFriends: () => void;
}

export function CafeScreen({ characterId, onBack, onChangeFriends, onSoundSettings }: Props) {
  const character = getCharacter(characterId);
  const [mode, setMode] = useState<Mode>('top');
  const [drink, setDrink] = useState<CafeDrink | null>(() => loadValue<CafeDrink | null>('cafeDrink', null));
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false); // 보드카페 게임
  const [quiet, setQuiet] = useState(false); // 조용히 머물기: 버튼을 숨기고 장면만

  const friends = useMemo(() => getCompanions(character.id).filter((c) => c.space === 'cafe'), [character.id]);
  const npcs = useMemo<WorldNpc[]>(() => {
    const looks = PLAYABLE.filter((c) => c.id !== character.id);
    return [
      ...AMBIENT.map((a, i) => ({ ...a, character: looks[(i + 1) % looks.length] })),
      ...friends.map((f) => ({ id: f.id, name: f.name, tag: f.doing, character: f.character, scale: f.character.premium ? 1.3 : undefined })),
    ];
  }, [friends, character.id]);

  const chatter = useMemo(
    () => ({ place: 'the café', speakers: [...AMBIENT.map((a) => ({ id: a.id, name: a.name })), ...friends.map((f) => ({ id: f.id, name: f.name }))], lines: CAFE_LINES, replies: CAFE_REPLIES }),
    [friends],
  );

  // 보드게임 친구(Luna·Hieu): 내 모습과 겹치지 않게
  const boardLooks = PLAYABLE.filter((c) => c.id !== character.id);

  const say = (t: string) => {
    setToast(t);
    window.setTimeout(() => setToast(null), 2200);
  };

  const carry = (d: CafeDrink) => {
    setDrink(d);
    save('cafeDrink', d);
    setMode('top');
    say('Carrying your drink — find a seat');
  };

  // 테이블 맞은편: 카페에 있는 친구가 있으면 그 친구, 없으면 다른 손님
  const across = friends[0]?.character ?? npcs[0].character;

  return (
    <motion.main className={`screen ${hud.space}`} {...screenMotion}>
      {/* 월드: 활동 화면으로 갈 때 카운터/자리 쪽으로 다가가듯 확대되며 흐려진다 */}
      <motion.div className={hud.layer} animate={mode === 'top' ? { scale: 1, opacity: 1 } : { scale: 1.35, opacity: 0 }} transition={{ duration: 0.7, ease: [0.45, 0, 0.2, 1] }}>
        <WorldScene
          config={CAFE}
          character={character}
          zones={ZONES}
          npcs={npcs}
          paused={mode !== 'top'}
          onAct={(z) => setMode(z.kind === 'counter' ? 'maker' : 'table')}
          hint={drink ? { title: 'Find a seat', text: 'Walk to a glowing chair and sit with your drink.' } : { title: 'Walk to the counter', text: 'Drag the stick, use WASD, or tap the floor.' }}
          carrying={drink && <DrinkGlass layers={drinkLayers(drink)} still />}
          onExit={onBack}
          exitLabel="Exit"
          chatter={chatter}
        />
      </motion.div>

      <AnimatePresence>
        {mode === 'maker' && <DrinkMaker key="maker" initial={drink} onCarry={carry} />}
        {mode === 'table' && (
          <motion.section key="table" className={hud.activity} aria-label="Your table" initial={{ opacity: 0, scale: 1.12 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.7 }}>
            <img className={`${hud.cover} ${styles.room}`} src={`${base}assets/places/cafe-backview.jpg`} alt="" draggable={false} />
            <motion.div className={styles.across} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: [0, -3, 0] }} transition={{ opacity: { delay: 0.5 }, y: { duration: 3.4, repeat: Infinity, ease: 'easeInOut' } }}>
              <CharacterSprite character={across} pose="front" />
            </motion.div>
            <div className={styles.table}>
              <img src={`${base}assets/cafe/table-top.jpg`} alt="" draggable={false} />
              {drink && (
                <motion.div className={styles.onTable} initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.55, type: 'spring', stiffness: 200, damping: 16 }}>
                  <DrinkGlass layers={drinkLayers(drink)} />
                </motion.div>
              )}
            </div>
            {quiet ? (
              <button type="button" className={styles.quiet} onClick={() => setQuiet(false)}>
                Staying quietly · tap to come back
              </button>
            ) : (
              <div className={hud.dock}>
                <p className={hud.caption}>{drink ? 'Your drink is on the table. You can simply stay.' : 'Nothing on the table yet — the counter is just over there.'}</p>
                <div className={hud.row}>
                  <button type="button" className={hud.dark} onClick={() => setQuiet(true)}>
                    Stay quietly
                  </button>
                  <button type="button" className={hud.dark} onClick={() => say(friends[0] ? `${friends[0].name} waved back` : 'Someone smiled back')}>
                    Talk
                  </button>
                </div>
                <button type="button" className={hud.light} onClick={() => setPlaying(true)}>
                  🎲 Play a game
                </button>
                <button type="button" className={styles.standUp} onClick={() => setMode('top')}>
                  Stand up
                </button>
              </div>
            )}
            <AnimatePresence>
              {playing && <BoardCafe me={character} luna={boardLooks[1]} hieu={boardLooks[0]} drink={drink ? drinkLayers(drink) : null} onClose={() => setPlaying(false)} />}
            </AnimatePresence>
          </motion.section>
        )}
      </AnimatePresence>

      {/* 보드게임 중에는 카페 HUD를 숨긴다(게임 화면이 자체 상단 바를 가짐) */}
      <header className={hud.top} hidden={playing}>
        <button type="button" className={hud.glassBtn} onClick={mode === 'top' ? onBack : () => setMode('top')} aria-label={mode === 'top' ? 'Leave the café' : 'Back to the café floor'}>
          <BackIcon />
        </button>
        <span className={hud.chip}>Café</span>
        <div className={hud.topActions}>
          <button type="button" className={hud.count} onClick={() => setFriendsOpen(true)} aria-label={`${npcs.length + 1} people here. Friends`}>
            <PeopleIcon /> {npcs.length + 1}
          </button>
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

      <FriendsSheet open={friendsOpen} onClose={() => setFriendsOpen(false)} me={character} onChangeCount={onChangeFriends} />
    </motion.main>
  );
}

// ───────── 음료 만들기: 재료를 고르면 줄기가 떨어지고, 그 재료의 액체 텍스처가 컵 안에 한 층 쌓인다 ─────────
function DrinkMaker({ initial, onCarry }: { initial: CafeDrink | null; onCarry: (d: CafeDrink) => void }) {
  const [steps, setSteps] = useState<string[]>(() => (initial ? drinkLayers(initial) : []));
  const [pouring, setPouring] = useState<string | null>(null);
  const [glow, setGlow] = useState(0); // 완성 순간 컵이 반짝
  const level = levelOf(steps);
  const full = level >= MAX_LEVEL - 0.05;
  const ready = level >= 0.5 && !pouring;

  const add = (id: string) => {
    if (pouring || full) return;
    setPouring(id);
    setSteps((s) => [...s, id]);
    window.setTimeout(() => {
      setPouring(null);
      setGlow((g) => g + 1);
    }, 1350);
  };

  const heading = pouring ? `Pouring ${ingredient(pouring).name.toLowerCase()}…` : ready ? 'Your drink is ready' : steps.length ? 'Add a little more' : 'Pick an ingredient';

  return (
    <motion.section className={hud.activity} aria-label="Make a drink" initial={{ opacity: 0, scale: 1.15 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.7 }}>
      {/* 카운터 사진과 같은 비율의 무대: 컵을 나무 받침 위에 정확히 올린다 */}
      <div className={styles.counter}>
        <img src={`${base}assets/cafe/counter-closeup.jpg`} alt="Café counter" draggable={false} />
        <motion.div className={styles.cupBox} animate={pouring ? { scaleY: [1, 0.97, 1.015, 1], scaleX: [1, 1.015, 0.99, 1] } : { scaleY: 1, scaleX: 1 }} transition={{ duration: 0.9, delay: 0.3 }}>
          <DrinkGlass className={styles.cup} layers={steps} pouring={pouring} />
          {ready && glow > 0 && <Sparkles key={glow} count={10} />}
        </motion.div>
      </div>

      <div className={hud.dock}>
        <h2 className={hud.title} aria-live="polite">
          {heading}
        </h2>
        <ul className={styles.tray} aria-label="Ingredients">
          {INGREDIENTS.map((i) => {
            const count = steps.filter((s) => s === i.id).length;
            const active = pouring === i.id;
            return (
              <li key={i.id}>
                <button type="button" onClick={() => add(i.id)} disabled={(!!pouring && !active) || full} aria-label={`Add ${i.name}`} className={active ? styles.trayOn : ''}>
                  {/* 고른 재료는 컵 쪽으로 기울어졌다 돌아온다 */}
                  <motion.img src={i.img} alt="" draggable={false} animate={active ? { y: [0, -16, -16, 0], rotate: [0, -24, -24, 0], scale: [1, 1.12, 1.12, 1] } : { y: 0, rotate: 0, scale: 1 }} transition={{ duration: 1.3, times: [0, 0.2, 0.75, 1] }} />
                  {count > 0 && <b>{count}</b>}
                </button>
                <small>{i.name}</small>
              </li>
            );
          })}
        </ul>
        <div className={hud.row}>
          <button type="button" className={hud.dark} onClick={() => setSteps([])} disabled={!steps.length || !!pouring}>
            Start over
          </button>
          <button
            type="button"
            className={hud.light}
            disabled={!ready}
            onClick={() => {
              const m = mix(steps);
              onCarry({ base: steps[0], additions: steps.slice(1), color: m.color, level: m.level, createdAt: new Date().toISOString() });
            }}
          >
            Carry drink
          </button>
        </div>
      </div>
    </motion.section>
  );
}
