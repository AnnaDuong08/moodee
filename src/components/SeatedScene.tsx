// 캐릭터 뒤 눈높이 교실: 고른 자리 쪽 의자에 앉은 모습으로 카메라가 다가감
import { motion } from 'framer-motion';
import { useRef } from 'react';
import type { SoundId } from '../audio/soundscape';
import type { Character } from '../data/characters';
import { CLASSMATES, classmateLooks } from '../data/classmates';
import { CLASSROOM } from '../data/places';
import { camera, useElementSize } from '../lib/useElementSize';
import { CharacterSprite } from './CharacterSprite';
import { SunLight } from './SunLight';
import styles from './SeatedScene.module.css';

interface Props {
  character: Character;
  side: 'left' | 'right';
  focusing: boolean;
  raised: boolean; // 아래쪽에 소리 설정 창이 열려 있으면 캐릭터가 보이도록 화면을 위로
  soundOn: (id: SoundId) => boolean;
  onToggleSound: (id: SoundId) => void;
  mySubject?: string; // 집중 중인 주제(내 이름표에 표시)
  onPeople: () => void;
}

const { width: W, height: H, back } = CLASSROOM;

// 배경 속 소리 오브젝트(이미지 px)
const HOTSPOTS: { id: SoundId; x: number; y: number; label: string }[] = [
  { id: 'clock', x: 482, y: 166, label: 'Clock' },
  { id: 'hum', x: 183, y: 158, label: 'Speaker' },
  { id: 'breeze', x: 99, y: 334, label: 'Window' },
];

const base = import.meta.env.BASE_URL;
const rowChairs = (row: 1 | 2) => `${base}assets/places/classroom-backview-chairs-row${row}.png`;

export function SeatedScene({ character, side, focusing, raised, soundOn, onToggleSound, mySubject, onPeople }: Props) {
  const looks = classmateLooks(character.id);
  const viewport = useRef<HTMLDivElement>(null);
  const { w: vw, h: vh } = useElementSize(viewport);
  const seat = back.seat[side];
  const cellH = back.charH * H;

  // 전체 교실에서 시작해 자리 쪽으로 살짝 다가가는 카메라.
  // 너무 확대하면 사진이 흐려지고 칠판이 잘려서 1.22배로, 칠판이 위쪽에 함께 보이게 머리 높이를 화면 52%에 둠
  const from = camera(vw || 1, vh || 1, W, H, 1, W / 2, H / 2);
  const to = camera(vw || 1, vh || 1, W, H, 1.22, seat.x, seat.hipY - cellH * 0.3, (vw || 1) / 2, (vh || 1) * (raised ? 0.3 : 0.52));

  return (
    <div ref={viewport} className={styles.viewport}>
      {vw > 0 && (
        <motion.div
          className={styles.stage}
          style={{ width: W, height: H, originX: 0, originY: 0 }}
          initial={{ x: from.x, y: from.y, scale: from.s }}
          animate={{ x: to.x, y: to.y, scale: to.s }}
          transition={{ duration: 1.4, ease: [0.45, 0, 0.2, 1] }}
        >
          <img className={styles.bg} src={back.src} alt="Classroom at eye level, seen from behind your seat" draggable={false} />
          <SunLight variant="back" />
          {/* 먼 줄부터: 앞줄(1·2번째 줄)에 앉은 친구 → 그 줄 의자 등받이. 가까운 줄이 나중에 그려져야 가려짐이 맞는다 */}
          {([1, 2] as const).map((row) => (
            <div key={row} className={styles.rowLayer}>
              {CLASSMATES.filter((m) => m.back.row === row).map((m, i) => (
                <div
                  key={m.id}
                  className={styles.me}
                  style={{
                    left: m.back.x,
                    top: m.back.hipY,
                    height: m.back.h * H,
                    translate: `-50% -${back.hipCut * 100}%`,
                    clipPath: `inset(0 0 ${(1 - back.hipCut) * 100}% 0)`,
                  }}
                >
                  <motion.div
                    className={styles.body}
                    animate={{ y: [0, 3, 0], rotate: [0, i % 2 ? 1 : -1, 0] }}
                    transition={{ duration: 2.2 + i * 0.7 + row * 0.4, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <CharacterSprite character={looks[m.id]} pose="back" />
                  </motion.div>
                </div>
              ))}
              <img className={styles.bg} src={rowChairs(row)} alt="" draggable={false} />
            </div>
          ))}

          {/* 엉덩이 아래를 잘라낸 캐릭터 → 그 위에 의자 등받이 레이어 */}
          <div
            className={styles.me}
            style={{
              left: seat.x,
              top: seat.hipY,
              height: cellH,
              translate: `-50% -${back.hipCut * 100}%`,
              clipPath: `inset(0 0 ${(1 - back.hipCut) * 100}% 0)`,
            }}
          >
            <motion.div
              className={styles.body}
              initial={{ y: -40, opacity: 0 }}
              animate={
                focusing
                  ? { y: [0, 6, 0], rotate: [0, -1.2, 0], opacity: 1 } // 필기하듯 고개를 까딱
                  : { y: [0, -3, 0], rotate: 0, opacity: 1 }
              }
              transition={{
                y: { duration: focusing ? 1.8 : 3.2, repeat: Infinity, ease: 'easeInOut' },
                rotate: { duration: 1.8, repeat: Infinity, ease: 'easeInOut' },
                opacity: { duration: 0.5, delay: 0.9 },
              }}
            >
              <CharacterSprite character={character} pose="back" />
            </motion.div>
          </div>
          <img className={styles.bg} src={back.chairs} alt="" draggable={false} />

          {/* 이름표: 누가 무엇을 공부 중인지(채팅 없이 상태만) */}
          {CLASSMATES.map((m) => (
            <button
              key={m.id}
              type="button"
              className={styles.tag}
              style={{ left: m.back.x, top: m.back.hipY - m.back.h * H * 0.5 }}
              onClick={onPeople}
              aria-label={`${m.name} is studying ${m.subject}. See everyone in this room`}
            >
              <b>{m.name}</b> {m.subject}
            </button>
          ))}
          {focusing && (
            <span className={`${styles.tag} ${styles.myTag}`} style={{ left: seat.x, top: seat.hipY - cellH * 0.5 }}>
              <b>You</b> {mySubject || 'Focusing'}
            </span>
          )}

          {HOTSPOTS.map((h) => {
            const on = soundOn(h.id);
            return (
              <button
                key={h.id}
                type="button"
                className={`${styles.hotspot} ${on ? styles.hotOn : ''}`}
                style={{ left: h.x, top: h.y }}
                onClick={() => onToggleSound(h.id)}
                aria-pressed={on}
                aria-label={`${h.label} sound ${on ? 'on' : 'off'}`}
              >
                <span />
              </button>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
