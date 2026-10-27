// Virtual joystick: emits the drag direction as a -1–1 vector (mobile-game-style movement)
import { useRef, useState } from 'react';
import { tr } from '../i18n';
import styles from './Joystick.module.css';

interface Props {
  onChange: (v: { x: number; y: number }) => void;
}

const MAX = 38; // Radius the knob can move (px)

export function Joystick({ onChange }: Props) {
  const base = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const active = useRef<number | null>(null);

  const update = (clientX: number, clientY: number) => {
    const r = base.current!.getBoundingClientRect();
    let dx = clientX - (r.left + r.width / 2);
    let dy = clientY - (r.top + r.height / 2);
    const d = Math.hypot(dx, dy);
    if (d > MAX) {
      dx = (dx / d) * MAX;
      dy = (dy / d) * MAX;
    }
    setKnob({ x: dx, y: dy });
    onChange({ x: dx / MAX, y: dy / MAX });
  };

  const end = () => {
    active.current = null;
    setKnob({ x: 0, y: 0 });
    onChange({ x: 0, y: 0 });
  };

  return (
    <div
      ref={base}
      className={styles.base}
      role="application"
      aria-label={tr('Move stick. You can also use arrow keys or tap the floor.')}
      onPointerDown={(e) => {
        e.stopPropagation();
        active.current = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
        update(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => active.current === e.pointerId && update(e.clientX, e.clientY)}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <div className={styles.knob} style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
    </div>
  );
}
