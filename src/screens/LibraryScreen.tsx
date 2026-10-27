// Library — Record / Organize
// 탑뷰에서 자리를 찾아 앉으면 눈높이 장면 → 책상 위 책으로 이어지고, 펼친 책의 빈 페이지에 직접 글을 쓴다
import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { BackgroundSoundButton } from '../components/BackgroundSound';
import { BackIcon, PeopleIcon } from '../components/Icons';
import { getCharacter, type CharacterId } from '../data/characters';
import { getCompanions } from '../lib/companions';
import { screenMotion } from '../lib/motion';
import { addThought, listThoughts, removeThought, updateThought, type Thought } from '../lib/thoughts';
import { FriendsSheet } from '../world/FriendsSheet';
import { WorldScene, type WorldConfig, type WorldNpc, type Zone } from '../world/WorldScene';
import hud from '../world/space.module.css';
import styles from './LibraryScreen.module.css';

const base = import.meta.env.BASE_URL;

// 좌표는 도서관 탑뷰 이미지(941×1672) 픽셀 기준
const LIBRARY: WorldConfig = {
  id: 'library',
  src: `${base}assets/places/library-topdown.jpg`,
  alt: 'Library seen from above',
  width: 941,
  height: 1672,
  bounds: [70, 345, 845, 1600],
  blockers: [
    [60, 150, 275, 410], [620, 215, 810, 360], // 사다리 책장, 안락의자
    [135, 510, 355, 690], [110, 665, 305, 775], // 왼쪽 위 책상
    [45, 825, 310, 1015], // 왼쪽 가운데 책상
    [420, 480, 550, 1055], // 가운데 긴 책장
    [650, 520, 745, 705], // 책 수레
    [635, 800, 845, 1005], [610, 1110, 810, 1315], // 오른쪽 책상 둘
    [0, 1030, 165, 1250], [0, 1225, 348, 1672], [583, 1335, 941, 1672], // 화분, 입구 양옆 책장
    [372, 1085, 445, 1195], // 통로에 서 있는 사람(배경 그림)
    [800, 345, 941, 1335], // 오른쪽 벽 책장
  ],
  start: { x: 466, y: 1520 },
  exit: { x: 466, y: 1588 },
  charH: 0.15,
  zoom: 1.2,
  waypoints: [{ x: 466, y: 1400 }, { x: 385, y: 1060 }, { x: 590, y: 1060 }, { x: 385, y: 450 }, { x: 590, y: 450 }, { x: 590, y: 760 }, { x: 385, y: 760 }, { x: 480, y: 1230 }],
};

const ZONES: Zone[] = [
  { id: 'd1', kind: 'seat', x: 245, y: 492, label: 'Sit and write' },
  { id: 'd2', kind: 'seat', x: 170, y: 800, label: 'Sit and write' },
  { id: 'd3', kind: 'seat', x: 735, y: 780, label: 'Sit and write' },
  { id: 'd4', kind: 'seat', x: 708, y: 1090, label: 'Sit and write' },
  { id: 'shelf', kind: 'notes', x: 485, y: 1078, label: 'My notes' },
];
// 도서관은 조용한 곳이라 말도 속삭이듯 짧게
const LIBRARY_LINES = [
  '(whispering) this corner is so quiet', 'found the book i was looking for', 'shh… someone is napping by the window', 'writing down an idea before i forget',
  'three pages left', 'the cat is sleeping on the rug again', 'anyone seen the ladder?', 'my notes are finally organized', 'taking a breath, then back to it',
  'this lamp light is lovely', 'reading the same line for the 5th time lol', 'just shelved a thought',
];
const LIBRARY_REPLIES = ['(quietly) hi', 'shh :)', 'good luck', 'nice, keep going', 'same here', 'ooh what are you writing?', 'mm-hm', 'you got this'];
const BAKED_PEOPLE = 3; // 배경 그림에 이미 그려진 사람 수(인원 표시에 포함)

const day = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

type Page = 'write' | 'notes';

interface Props {
  characterId: CharacterId | null;
  onBack: () => void;
  onSoundSettings: () => void;
  onChangeFriends: () => void;
}

export function LibraryScreen({ characterId, onBack, onChangeFriends, onSoundSettings }: Props) {
  const character = getCharacter(characterId);
  const [seated, setSeated] = useState(false);
  const [open, setOpen] = useState(false); // 책을 펼쳤는지
  const [page, setPage] = useState<Page>('write');
  const [notes, setNotes] = useState<Thought[]>(listThoughts);
  const [editing, setEditing] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [saved, setSaved] = useState(false);
  const [friendsOpen, setFriendsOpen] = useState(false);

  const friends = useMemo(() => getCompanions(character.id).filter((c) => c.space === 'library'), [character.id]);
  const npcs = useMemo<WorldNpc[]>(() => friends.map((f) => ({ id: f.id, name: f.name, tag: f.doing, character: f.character, scale: f.character.premium ? 1.3 : undefined })), [friends]);

  // 친구가 없으면 그림 속 사람들이 말한다(말풍선 없이 채팅 줄만)
  const chatter = useMemo(
    () => ({ place: 'the library', speakers: [...friends.map((f) => ({ id: f.id, name: f.name })), { name: 'Noa' }, { name: 'Eli' }], lines: LIBRARY_LINES, replies: LIBRARY_REPLIES }),
    [friends],
  );

  const act = (z: Zone) => {
    setSeated(true);
    const toNotes = z.kind === 'notes';
    setPage(toNotes ? 'notes' : 'write');
    setOpen(toNotes);
  };
  const standUp = () => {
    setOpen(false);
    setSeated(false);
  };

  const saveNote = () => {
    if (!text.trim()) return;
    if (editing) updateThought(editing, text);
    else setEditing(addThought(text, 'Library').id);
    setNotes(listThoughts());
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };
  const newPage = () => {
    setEditing(null);
    setText('');
    setPage('write');
  };
  const reopen = (n: Thought) => {
    setEditing(n.id);
    setText(n.text);
    setPage('write');
  };
  const dirty = text.trim() !== '' && text.trim() !== (notes.find((n) => n.id === editing)?.text ?? '');

  return (
    <motion.main className={`screen ${hud.space}`} {...screenMotion}>
      <motion.div className={hud.layer} animate={seated ? { scale: 1.35, opacity: 0 } : { scale: 1, opacity: 1 }} transition={{ duration: 0.7, ease: [0.45, 0, 0.2, 1] }}>
        <WorldScene config={LIBRARY} character={character} zones={ZONES} npcs={npcs} paused={seated} onAct={act} onExit={onBack} chatter={chatter} hint={{ title: 'Find a desk', text: 'Walk to a glowing seat, or visit the middle shelf for your notes.' }} />
      </motion.div>

      <AnimatePresence>
        {seated && (
          <motion.section key="desk" className={hud.activity} aria-label="Your desk" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }}>
            {/* 눈높이 도서관: 앉으면서 천천히 다가간다 */}
            <motion.img
              className={hud.cover}
              src={`${base}assets/library/eyelevel.jpg`}
              alt="The library at eye level"
              draggable={false}
              initial={{ scale: 1.2 }}
              animate={{ scale: open ? 1.12 : 1, filter: open ? 'blur(5px) brightness(0.55)' : 'blur(0px) brightness(1)' }}
              transition={{ duration: 1, ease: [0.45, 0, 0.2, 1] }}
            />

            {/* 펼친 책: 닫힌 상태는 책상 위(아래쪽), 열면 한 페이지가 화면을 채운다 */}
            <motion.div
              className={styles.book}
              initial={{ y: '60%', opacity: 0 }}
              animate={open ? { width: '200%', left: page === 'write' ? '0%' : '-100%', top: '50%', y: '-52%', opacity: 1 } : { width: '112%', left: '-6%', top: '100%', y: '-128%', opacity: 1 }}
              transition={{ duration: 0.7, ease: [0.45, 0, 0.2, 1], opacity: { delay: open ? 0 : 0.5 } }}
            >
              <img src={`${base}assets/library/open-book.png`} alt="" draggable={false} />
              {!open && <button type="button" className={styles.bookTap} onClick={() => setOpen(true)} aria-label="Open book" />}

              {open && (
                <>
                  {/* 왼쪽 페이지: 책 위에 바로 쓰는 투명한 글쓰기 영역 */}
                  <motion.div className={`${styles.page} ${styles.left}`} animate={saved ? { opacity: [1, 0.55, 1], y: [0, 2, 0] } : { opacity: 1 }} transition={{ duration: 0.7 }}>
                    <label htmlFor="library-note" className={styles.pageHead}>
                      {editing ? `Note · ${day(notes.find((n) => n.id === editing)?.createdAt ?? new Date().toISOString())}` : 'New note'}
                    </label>
                    <textarea id="library-note" className={styles.writing} value={text} placeholder="Write what you want to keep…" spellCheck={false} onChange={(e) => setText(e.target.value)} />
                    <AnimatePresence>
                      {saved && (
                        <motion.span className={styles.bookmark} initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }}>
                          Saved to Library
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.div>

                  {/* 오른쪽 페이지: 내 노트 목록(교실에서 내려놓은 생각 포함) */}
                  <div className={`${styles.page} ${styles.right}`}>
                    <span className={styles.pageHead}>My notes</span>
                    {notes.length === 0 ? (
                      <p className={styles.blank}>Nothing here yet. Thoughts you set down in the Classroom land on this page too.</p>
                    ) : (
                      <ul className={styles.index}>
                        {notes.map((n) => (
                          <li key={n.id}>
                            <button type="button" onClick={() => reopen(n)} aria-label={`Open note: ${n.text.slice(0, 40)}`}>
                              <b>{n.text}</b>
                              <small>
                                {day(n.createdAt)} · {n.from ?? 'Library'}
                              </small>
                            </button>
                            <button type="button" className={styles.del} onClick={() => (removeThought(n.id), setNotes(listThoughts()), editing === n.id && newPage())} aria-label="Remove note">
                              ×
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              )}
            </motion.div>

            <div className={hud.dock}>
              {open ? (
                <>
                  <div className={hud.row}>
                    <button type="button" className={hud.dark} onClick={() => setPage(page === 'write' ? 'notes' : 'write')}>
                      {page === 'write' ? `My notes (${notes.length}) ›` : '‹ Back to writing'}
                    </button>
                    {page === 'write' ? (
                      <button type="button" className={hud.light} onClick={saveNote} disabled={!dirty}>
                        Save
                      </button>
                    ) : (
                      <button type="button" className={hud.light} onClick={newPage}>
                        New note
                      </button>
                    )}
                  </div>
                  <div className={hud.row}>
                    {page === 'write' && editing && (
                      <button type="button" className={hud.dark} onClick={newPage}>
                        New note
                      </button>
                    )}
                    <button type="button" className={hud.dark} onClick={() => setOpen(false)}>
                      Close book
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className={hud.caption}>A quiet desk. The book is yours.</p>
                  <div className={hud.row}>
                    <button type="button" className={hud.dark} onClick={standUp}>
                      Stand up
                    </button>
                    <button type="button" className={hud.light} onClick={() => setOpen(true)}>
                      Open book
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <header className={hud.top}>
        <button type="button" className={hud.glassBtn} onClick={open ? () => setOpen(false) : seated ? standUp : onBack} aria-label={seated ? 'Back' : 'Leave the library'}>
          <BackIcon />
        </button>
        <span className={hud.chip}>Library</span>
        <div className={hud.topActions}>
          <button type="button" className={hud.count} onClick={() => setFriendsOpen(true)} aria-label={`${npcs.length + BAKED_PEOPLE + 1} people here. Friends`}>
            <PeopleIcon /> {npcs.length + BAKED_PEOPLE + 1}
          </button>
          <BackgroundSoundButton dark onClick={onSoundSettings} />
        </div>
      </header>

      <FriendsSheet open={friendsOpen} onClose={() => setFriendsOpen(false)} me={character} onChangeCount={onChangeFriends} />
    </motion.main>
  );
}
