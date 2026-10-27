// 캐릭터 시트에서 원하는 컷(앞/옆/뒤)만 background-position으로 잘라 보여줌
// 시트가 없으면 같은 비율의 파스텔 치비 플레이스홀더를 그린다
import type { CSSProperties } from 'react';
import { CELL_ASPECT, POSE, type Character, type Pose } from '../data/characters';
import { useImageOk } from '../lib/useImageOk';
import styles from './CharacterSprite.module.css';

interface Props {
  character: Character;
  pose?: Pose;
  className?: string;
  style?: CSSProperties;
}

export function CharacterSprite({ character, pose = 'front', className, style }: Props) {
  const status = useImageOk(character.sheet);
  const idx = POSE[pose];

  return (
    <div
      className={`${styles.sprite} ${className ?? ''}`}
      style={{ aspectRatio: `${CELL_ASPECT}`, ...style }}
      role="img"
      aria-label={`${character.name}, ${pose} view`}
    >
      {status === 'ok' && (
        <div
          className={styles.sheet}
          style={{
            backgroundImage: `url("${character.sheet}")`,
            // 4컷 시트: 0%, 33.33%, 66.67%, 100%
            backgroundPosition: `${(idx / 3) * 100}% 0`,
          }}
        />
      )}
      {status === 'error' && <Placeholder hair={character.hair} back={pose === 'back'} />}
    </div>
  );
}

function Placeholder({ hair, back }: { hair: string; back: boolean }) {
  return (
    <svg className={styles.placeholder} viewBox="0 0 400 1086" aria-hidden>
      <ellipse cx="200" cy="840" rx="110" ry="16" fill="#000" opacity="0.08" />
      <rect x="134" y="560" width="132" height="270" rx="50" fill="#C9B8E0" />
      <circle cx="200" cy="430" r="150" fill="#F5E1D3" />
      <path d="M50 430a150 150 0 0 1 300 0c0-40-60-30-150-30S50 390 50 430z" fill={hair} opacity={back ? 1 : 0.9} />
      {back ? (
        <circle cx="200" cy="440" r="140" fill={hair} />
      ) : (
        <>
          <circle cx="149" cy="455" r="12" fill="#2E2A2A" />
          <circle cx="251" cy="455" r="12" fill="#2E2A2A" />
          <circle cx="131" cy="495" r="18" fill="#F4B6B0" opacity="0.8" />
          <circle cx="269" cy="495" r="18" fill="#F4B6B0" opacity="0.8" />
        </>
      )}
    </svg>
  );
}
