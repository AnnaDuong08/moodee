// 공간별 기능 패널: Library(생각 선반) · Museum(카메라 → 찰칵 → 전시) · Café(음료·친구) · My Room(옷장·방 스타일)
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { CharacterSprite } from '../../components/CharacterSprite';
import { Sparkles, UnlockModal } from '../../components/Coin';
import { CoinIcon, LockIcon } from '../../components/Icons';
import { getFriends } from '../../components/PeopleSheet';
import { CAMERA_SCENES, CLOUDEE_PRICE, DRINKS, EXHIBIT_OBJECTS, MONTHLY_REWARDS, ROOM_LOOKS, WARDROBE, type ExhibitObjectId } from '../../config/economy';
import { CHARACTERS as ALL_CHARACTERS, PLAYABLE, type Character, type CharacterId } from '../../data/characters';
import { CLASSMATES, classmateLooks } from '../../data/classmates';
import { addMemory, listMemories, type Memory } from '../../lib/memories';
import { addThought, listThoughts, removeThought, toggleThought } from '../../lib/thoughts';
import { hasCloudee, orderDrink, ownsPart, setRoomLook, unlockCloudee, unlockPart, unlockRoomLook, useWallet, wear } from '../../lib/wallet';
import styles from './panels.module.css';

const day = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
const SPINES = ['#9F88C4', '#E8955A', '#9BAE8C', '#F2C46B', '#6E86D8', '#E9A3B0'];
export const exhibitImg = (id: string) => EXHIBIT_OBJECTS[id as ExhibitObjectId]?.img;

// ───────── Library: 생각을 머리 밖으로 꺼내 선반에 꽂기 ─────────
export function LibraryPanel() {
  const [thoughts, setThoughts] = useState(listThoughts);
  const [draft, setDraft] = useState('');
  const refresh = () => setThoughts(listThoughts());

  const shelve = () => {
    if (!draft.trim()) return;
    addThought(draft, 'Library');
    setDraft('');
    refresh();
  };

  return (
    <>
      <div className={styles.inputRow}>
        <input value={draft} maxLength={80} placeholder="What’s on your mind?" aria-label="Write a thought" onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && shelve()} />
        <button type="button" className={styles.small} onClick={shelve} disabled={!draft.trim()}>
          Shelve
        </button>
      </div>
      {thoughts.length === 0 ? (
        <p className={styles.empty}>Your shelf is empty. Thoughts you park during focus land here too.</p>
      ) : (
        <ul className={styles.books}>
          <AnimatePresence initial={false}>
            {thoughts.map((t, i) => (
              <motion.li key={t.id} layout initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }} className={t.done ? styles.bookDone : ''}>
                <span className={styles.spine} style={{ background: SPINES[i % SPINES.length] }} />
                <button type="button" className={styles.bookText} onClick={() => (toggleThought(t.id), refresh())} aria-pressed={!!t.done}>
                  <b>{t.text}</b>
                  <small>
                    {day(t.createdAt)} · {t.from ?? 'Library'}
                    {t.done ? ' · done' : ''}
                  </small>
                </button>
                <button type="button" className={styles.x} onClick={() => (removeThought(t.id), refresh())} aria-label={`Remove “${t.text}”`}>
                  ×
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </>
  );
}

// ───────── Museum: 전시 목록 ─────────
export function MuseumPanel({ memories, featured, onFeature, onCamera }: { memories: Memory[]; featured: Memory | null; onFeature: (m: Memory) => void; onCamera: () => void }) {
  return (
    <>
      {memories.length === 0 ? (
        <p className={styles.empty}>The pedestal is waiting. Snap a moment and it becomes an object you can keep.</p>
      ) : (
        <ul className={styles.gallery} aria-label="Your exhibits">
          {memories.map((m) => (
            <li key={m.id}>
              <button type="button" className={featured?.id === m.id ? styles.galleryOn : ''} onClick={() => onFeature(m)} aria-label={`Show ${m.moment}`}>
                <img src={exhibitImg(m.objectId)} alt="" />
                <small>{day(m.createdAt)}</small>
              </button>
            </li>
          ))}
        </ul>
      )}
      {featured && (
        <p className={styles.caption}>
          <b>{featured.moment}</b>
          {featured.story && featured.story !== featured.moment && <> — {featured.story}</>}
        </p>
      )}
      <button type="button" className="pill pill-primary" onClick={onCamera}>
        Open camera
      </button>
    </>
  );
}

// 셔터 소리(짧은 찰칵): 두 번의 노이즈 클릭
export function shutterSound() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) ** 2;
    [0, 0.09].forEach((t, k) => {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = k ? 1800 : 3200;
      const g = ctx.createGain();
      g.gain.value = 0.5;
      src.connect(f).connect(g).connect(ctx.destination);
      src.start(ctx.currentTime + t);
    });
    window.setTimeout(() => void ctx.close(), 600);
  } catch {
    /* 오디오를 못 쓰는 환경이면 조용히 넘어감 */
  }
}

// ───────── Museum 카메라: 장면 고르기 → 찰칵 → 3D 오브젝트로 변환 → 이야기 → 전시 ─────────
type CamStep = 'aim' | 'flash' | 'developing' | 'object';

export function CameraCapture({ onClose, onExhibit }: { onClose: () => void; onExhibit: (m: Memory) => void }) {
  const [scene, setScene] = useState(CAMERA_SCENES[0]);
  const [step, setStep] = useState<CamStep>('aim');
  const [story, setStory] = useState('');
  const object = EXHIBIT_OBJECTS[scene.object];

  const shoot = () => {
    if (step !== 'aim') return;
    shutterSound();
    setStep('flash');
    window.setTimeout(() => setStep('developing'), 450);
    window.setTimeout(() => setStep('object'), 1900);
  };

  const exhibit = () => onExhibit(addMemory({ moment: object.name, objectId: scene.object, story: story.trim(), photo: scene.photo }));

  return (
    <motion.div className={styles.camera} role="dialog" aria-modal="true" aria-label="Camera" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className={styles.camTop}>
        <button type="button" className={styles.camClose} onClick={onClose} aria-label="Close camera">
          ×
        </button>
        <span>{step === 'aim' ? 'Frame a moment to keep' : step === 'object' ? 'Memory object ready' : 'Click!'}</span>
        <span className={styles.camDot} data-live={step === 'aim'} />
      </div>

      <div className={styles.viewfinder}>
        <AnimatePresence mode="wait">
          {step !== 'object' ? (
            <motion.img
              key={scene.id}
              src={scene.photo}
              alt={scene.label}
              className={styles.shot}
              initial={{ opacity: 0, scale: 1.06 }}
              animate={step === 'developing' ? { opacity: 1, scale: 0.78, rotate: -3, borderRadius: 18 } : { opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.4, rotate: 8 }}
              transition={{ duration: 0.45 }}
            />
          ) : (
            <motion.div key="object" className={styles.objectStage} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <motion.img src={object.img} alt={object.name} initial={{ scale: 0.2, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 220, damping: 13 }} />
              <Sparkles count={16} />
            </motion.div>
          )}
        </AnimatePresence>

        {step === 'aim' && (
          <>
            <i className={`${styles.corner} ${styles.tl}`} />
            <i className={`${styles.corner} ${styles.tr}`} />
            <i className={`${styles.corner} ${styles.bl}`} />
            <i className={`${styles.corner} ${styles.br}`} />
            <motion.span className={styles.focus} animate={{ scale: [1.25, 1, 1], opacity: [0, 1, 0.7] }} transition={{ duration: 1.1, repeat: Infinity, repeatDelay: 1.2 }} key={scene.id} />
          </>
        )}
        {step === 'developing' && <p className={styles.developing}>Turning it into a memory object…</p>}
        <AnimatePresence>{step === 'flash' && <motion.span className={styles.flash} initial={{ opacity: 1 }} animate={{ opacity: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} />}</AnimatePresence>
      </div>

      {step === 'object' ? (
        <motion.div className={styles.camBottom} initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <h3>{object.name}</h3>
          <input value={story} maxLength={70} placeholder="One line about this moment (optional)" aria-label="Story" onChange={(e) => setStory(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && exhibit()} />
          <button type="button" className="pill pill-primary" onClick={exhibit}>
            Place on the pedestal
          </button>
        </motion.div>
      ) : (
        <div className={styles.camBottom}>
          <ul className={styles.roll} aria-label="What is in front of the camera">
            {CAMERA_SCENES.map((s) => (
              <li key={s.id}>
                <button type="button" className={scene.id === s.id ? styles.rollOn : ''} onClick={() => step === 'aim' && setScene(s)} aria-label={s.label} aria-pressed={scene.id === s.id}>
                  <img src={s.photo} alt="" />
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className={styles.shutter} onClick={shoot} disabled={step !== 'aim'} aria-label="Take the photo">
            <span />
          </button>
          <p className={styles.camHint}>{scene.label}</p>
        </div>
      )}
    </motion.div>
  );
}

// ───────── Café: 사람들 사이에 머물기 + 코인으로 음료 주문 ─────────
export function CafePanel({ me, onOrder, onFriends }: { me: Character; onOrder: (tint: string) => void; onFriends: () => void }) {
  const wallet = useWallet();
  const friends = getFriends();
  const looks = classmateLooks(me.id);
  const [note, setNote] = useState<string | null>(null);

  const order = (d: (typeof DRINKS)[number]) => {
    if (!orderDrink(d.price)) {
      setNote('Not enough coins yet — study to earn more.');
      return;
    }
    onOrder(d.tint);
    setNote(`${d.name} is on the counter. Take your time.`);
  };

  return (
    <>
      <img className={styles.ingredients} src={`${import.meta.env.BASE_URL}assets/objects/cafe-ingredients.png`} alt="" />
      <ul className={styles.menu}>
        {DRINKS.map((d) => (
          <li key={d.id}>
            <button type="button" onClick={() => order(d)} disabled={wallet.coins < d.price}>
              <span className={styles.cup} style={{ background: d.tint }} />
              <b>{d.name}</b>
              <small>
                <CoinIcon width={14} height={14} /> {d.price}
              </small>
            </button>
          </li>
        ))}
      </ul>
      {note ? <p className={styles.caption}>{note}</p> : wallet.coins < 5 && <p className={styles.caption}>Drinks cost coins. Finish a session to earn some.</p>}

      <h3 className={styles.sub}>At the tables{wallet.drinks > 0 ? ` · ${wallet.drinks} drink${wallet.drinks > 1 ? 's' : ''} so far` : ''}</h3>
      <div className={styles.tableRow}>
        {CLASSMATES.map((m) => (
          <span key={m.id} className={`${styles.face} ${friends.includes(m.id) ? styles.faceFriend : ''}`}>
            <span className={styles.faceCrop}>
              <CharacterSprite character={looks[m.id]} pose="front" className={styles.faceSprite} style={{ height: '250%' }} />
            </span>
            <small>{m.name}</small>
          </span>
        ))}
        <button type="button" className={styles.small} onClick={onFriends}>
          Friends & invites
        </button>
      </div>
      <p className={styles.note}>Demo Cloudees. Conversations open later — for now you can simply be here together.</p>
    </>
  );
}

// ───────── My Room: 옷장(Cloudee·파츠) + 방 스타일 ─────────
type Pending = { kind: 'cloudee'; id: CharacterId } | { kind: 'part'; id: string; img: string; noun: string; price: number } | { kind: 'room'; id: string };

const CHARACTERS = PLAYABLE;

export function RoomPanel({ me, onChangeCharacter, monthDays, wardrobeOnly }: { me: Character; onChangeCharacter: (id: CharacterId) => void; monthDays: number; wardrobeOnly?: boolean }) {
  const wallet = useWallet();
  const [mode, setMode] = useState<'wardrobe' | 'decorate'>('wardrobe');
  const [tab, setTab] = useState<string>('look');
  const [pending, setPending] = useState<Pending | null>(null);
  const parts = WARDROBE.find((t) => t.id === tab);
  const pendingRoom = pending?.kind === 'room' ? ROOM_LOOKS.find((r) => r.id === pending.id) : undefined;

  const confirm = () => {
    if (!pending) return false;
    if (pending.kind === 'cloudee') return unlockCloudee(pending.id);
    if (pending.kind === 'part') return unlockPart(pending.id);
    return unlockRoomLook(pending.id);
  };

  return (
    <>
      <div className={styles.segment} role="tablist" hidden={wardrobeOnly}>
        {(['wardrobe', 'decorate'] as const).map((m) => (
          <button key={m} type="button" role="tab" aria-selected={mode === m} className={mode === m ? styles.segOn : ''} onClick={() => setMode(m)}>
            {m === 'wardrobe' ? 'Wardrobe' : 'Decorate'}
          </button>
        ))}
      </div>

      {mode === 'wardrobe' ? (
        <>
          <div className={styles.tabs} role="tablist">
            <button type="button" role="tab" aria-selected={tab === 'look'} className={tab === 'look' ? styles.tabOn : ''} onClick={() => setTab('look')}>
              Cloudee
            </button>
            {WARDROBE.map((t) => (
              <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tab === t.id ? styles.tabOn : ''} onClick={() => setTab(t.id)}>
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'look' ? (
            <div className={styles.grid4}>
              {ALL_CHARACTERS.filter((c) => !c.premium || wallet.plan === 'pro').map((c) => {
                const owned = hasCloudee(wallet, c);
                return (
                  <button key={c.id} type="button" className={`${styles.tile} ${me.id === c.id ? styles.tileOn : ''}`} onClick={() => (owned ? onChangeCharacter(c.id) : setPending({ kind: 'cloudee', id: c.id }))} aria-label={owned ? `Use ${c.name}` : `${c.name}, locked`}>
                    <span className={styles.lookCrop}>
                      <CharacterSprite character={c} pose="front" className={`${styles.faceSprite} ${owned ? '' : styles.dim}`} style={{ height: '230%' }} />
                    </span>
                    {!owned && <LockBadge price={CLOUDEE_PRICE} />}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className={styles.grid4}>
              {parts!.items.map((it) => {
                const owned = ownsPart(wallet, it.id);
                const on = wallet.wearing[tab] === it.id;
                return (
                  <button
                    key={it.id}
                    type="button"
                    className={`${styles.tile} ${on ? styles.tileOn : ''}`}
                    onClick={() => (owned ? wear(tab, it.id) : setPending({ kind: 'part', id: it.id, img: it.img, noun: parts!.noun, price: it.price }))}
                    aria-label={owned ? `Pick ${parts!.noun}` : `Locked ${parts!.noun}, ${it.price} coins`}
                    aria-pressed={on}
                  >
                    <img src={it.img} alt="" className={owned ? '' : styles.dimPart} loading="lazy" />
                    {!owned && <LockBadge />}
                  </button>
                );
              })}
            </div>
          )}

          <h3 className={styles.sub}>Monthly rewards · {monthDays}/30 days</h3>
          <ul className={styles.rewardRow}>
            {MONTHLY_REWARDS.map((r) => {
              const owned = wallet.rewards.includes(r.id);
              return (
                <li key={r.id} className={owned ? styles.rewardOn : ''}>
                  <img src={r.img} alt="" />
                  <small>{owned ? r.name : `Day ${r.day} · Pro`}</small>
                </li>
              );
            })}
          </ul>
          {tab !== 'look' && <p className={styles.note}>Your picks are saved. Showing parts on your Cloudee needs layered art — that comes next.</p>}
        </>
      ) : (
        <>
          <div className={styles.rooms}>
            {ROOM_LOOKS.map((r) => {
              const owned = wallet.roomLooks.includes(r.id);
              const on = wallet.roomLook === r.id;
              return (
                <button key={r.id} type="button" className={`${styles.room} ${on ? styles.tileOn : ''}`} onClick={() => (owned ? setRoomLook(r.id) : setPending({ kind: 'room', id: r.id }))} aria-label={owned ? `Use ${r.name}` : `${r.name}, ${r.price} coins`} aria-pressed={on}>
                  <img src={r.src} alt="" className={owned ? '' : styles.dimPart} loading="lazy" />
                  <b>{r.name}</b>
                  {!owned && <LockBadge price={r.price} />}
                </button>
              );
            })}
          </div>
          <p className={styles.note}>Your room grows with what you earn. Tap a style to move in.</p>
        </>
      )}

      <UnlockModal
        open={!!pending}
        title={pending?.kind === 'cloudee' ? 'Unlock this Cloudee?' : pending?.kind === 'part' ? `Unlock this ${pending.noun}?` : `Unlock ${pendingRoom?.name ?? 'this room'}?`}
        price={pending?.kind === 'cloudee' ? CLOUDEE_PRICE : pending?.kind === 'part' ? pending.price : (pendingRoom?.price ?? 0)}
        preview={
          pending?.kind === 'cloudee' ? (
            <div className={styles.lookCrop}>
              <CharacterSprite character={CHARACTERS.find((c) => c.id === pending.id)!} pose="front" className={styles.faceSprite} style={{ height: '230%' }} />
            </div>
          ) : (
            <img src={pending?.kind === 'part' ? pending.img : pendingRoom?.src} alt="" />
          )
        }
        onCancel={() => setPending(null)}
        onConfirm={confirm}
      />
    </>
  );
}

function LockBadge({ price }: { price?: number }) {
  return (
    <span className={styles.lockBadge}>
      <LockIcon width={11} height={11} />
      {price ? <b>{price}</b> : null}
    </span>
  );
}

export { listMemories };
