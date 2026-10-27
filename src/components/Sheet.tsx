// 공용 바텀시트: 손잡이를 끌어내리거나 배경을 눌러 닫기
import { AnimatePresence, motion, useDragControls } from 'framer-motion';
import type { ReactNode } from 'react';
import styles from './Sheet.module.css';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  action?: ReactNode; // 제목 오른쪽 버튼
  dismissable?: boolean; // false면 배경을 눌러도 닫히지 않음(필수 단계)
  belowHeader?: boolean;
  children: ReactNode;
}

export function Sheet({ open, onClose, title, subtitle, action, dismissable = true, belowHeader = false, children }: Props) {
  const drag = useDragControls();
  return (
    <AnimatePresence>
      {open && (
        <motion.div className={`${styles.backdrop} ${belowHeader ? styles.belowHeader : ''}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={dismissable ? onClose : undefined}>
          <motion.section
            className={styles.sheet}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ y: '100%' }}
            animate={{ y: 0, transition: { type: 'spring', stiffness: 300, damping: 32 } }}
            exit={{ y: '100%', transition: { duration: 0.2 } }}
            drag={dismissable ? 'y' : false}
            dragListener={false}
            dragControls={drag}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={(_, info) => (info.offset.y > 80 || info.velocity.y > 500) && onClose()}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.gripArea} onPointerDown={(e) => dismissable && drag.start(e)} aria-hidden>
              <div className={styles.grip} />
            </div>
            <div className={styles.head}>
              <div>
                <h2>{title}</h2>
                {subtitle && <p>{subtitle}</p>}
              </div>
              {action}
            </div>
            {children}
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
