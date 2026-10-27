// 같은 공간의 사람들: 무엇을 공부 중인지 확인 + 친구 추가 + 친구 초대(포스트잇 "ADD FRIEND / Invite others to study")
// 채팅은 없다 — 공부 상태만 공유한다
import { useState } from 'react';
import { CLASSMATES, classmateLooks } from '../data/classmates';
import type { Character } from '../data/characters';
import { loadValue, save } from '../lib/storage';
import { CharacterSprite } from './CharacterSprite';
import { Sheet } from './Sheet';
import styles from './PeopleSheet.module.css';

interface Props {
  open: boolean;
  onClose: () => void;
  me: Character;
  mySubject?: string; // 집중 중이면 내 주제도 맨 위에 표시
  title?: string;
}

export const getFriends = () => loadValue<string[]>('friends', []);

export function PeopleSheet({ open, onClose, me, mySubject, title = 'Studying in this room' }: Props) {
  const [friends, setFriends] = useState<string[]>(getFriends);
  const [invited, setInvited] = useState(false);
  const looks = classmateLooks(me.id);

  const toggle = (id: string) => {
    const next = friends.includes(id) ? friends.filter((f) => f !== id) : [...friends, id];
    setFriends(next);
    save('friends', next);
  };

  // 초대: 기기의 공유 시트, 없으면 링크 복사
  const invite = async () => {
    const data = { title: 'MOODEE', text: 'Come study with me on MOODEE — same room, no chat.', url: location.href };
    try {
      if (navigator.share) await navigator.share(data);
      else await navigator.clipboard.writeText(`${data.text} ${data.url}`);
      setInvited(true);
      window.setTimeout(() => setInvited(false), 2400);
    } catch {
      /* 사용자가 공유를 취소한 경우 */
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={title} subtitle="No chat here — you only see what everyone is working on.">
      <ul className={styles.list}>
        {mySubject !== undefined && (
          <li className={`${styles.row} ${styles.me}`}>
            <Avatar character={me} />
            <div className={styles.who}>
              <b>You</b>
              <small>{mySubject || 'Focusing'}</small>
            </div>
          </li>
        )}
        {CLASSMATES.map((m) => {
          const isFriend = friends.includes(m.id);
          return (
            <li key={m.id} className={styles.row}>
              <Avatar character={looks[m.id]} />
              <div className={styles.who}>
                <b>{m.name}</b>
                <small>
                  {m.subject} · seat {m.topSeat}
                </small>
              </div>
              <button type="button" className={`${styles.add} ${isFriend ? styles.added : ''}`} aria-pressed={isFriend} onClick={() => toggle(m.id)}>
                {isFriend ? 'Friends ✓' : 'Add friend'}
              </button>
            </li>
          );
        })}
      </ul>

      <button type="button" className="pill pill-soft" style={{ width: '100%' }} onClick={invite}>
        {invited ? 'Invite ready to send ✓' : 'Invite a friend to study'}
      </button>
      <p className={styles.note}>Demo classmates. Live rooms with your real friends come with sign-in.</p>
    </Sheet>
  );
}

function Avatar({ character }: { character: Character }) {
  return (
    <span className={styles.avatar} aria-hidden>
      <CharacterSprite character={character} pose="front" className={styles.avatarSprite} style={{ height: '250%' }} />
    </span>
  );
}
