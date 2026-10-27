// 친구 목록(보조 기능): 데모 친구가 지금 어느 공간에 있는지 + 초대(모의) + 인원수 바꾸기
import { useState } from 'react';
import { CharacterSprite } from '../components/CharacterSprite';
import { Sheet } from '../components/Sheet';
import type { Character } from '../data/characters';
import { getCompanions, SPACE_NAME } from '../lib/companions';
import styles from './space.module.css';

interface Props {
  open: boolean;
  onClose: () => void;
  me: Character;
  onChangeCount?: () => void;
}

export function FriendsSheet({ open, onClose, me, onChangeCount }: Props) {
  const friends = getCompanions(me.id);
  const [invited, setInvited] = useState(false);
  return (
    <Sheet open={open} onClose={onClose} title="Friends" subtitle="Demo companions — they wander the world on their own.">
      {friends.length === 0 ? (
        <p className={styles.empty}>You came alone this time. That is okay too.</p>
      ) : (
        <ul className={styles.friends}>
          {friends.map((f) => (
            <li key={f.id}>
              <span className={`${styles.face} ${f.character.premium ? styles.faceCloud : ''}`} aria-hidden>
                <CharacterSprite character={f.character} pose="front" style={{ height: '250%' }} />
              </span>
              <b>{f.name}</b>
              <small>{SPACE_NAME[f.space]}</small>
            </li>
          ))}
        </ul>
      )}
      <div style={{ display: 'grid', gap: 8 }}>
        <button
          type="button"
          className="pill pill-soft"
          style={{ width: '100%', minHeight: 50 }}
          onClick={() => {
            setInvited(true);
            window.setTimeout(() => setInvited(false), 2200);
          }}
        >
          {invited ? 'Invite link ready ✓ (demo)' : 'Invite a friend'}
        </button>
        {onChangeCount && (
          <button type="button" className="pill pill-soft" style={{ width: '100%', minHeight: 50 }} onClick={onChangeCount}>
            Change how many friends join
          </button>
        )}
      </div>
    </Sheet>
  );
}
