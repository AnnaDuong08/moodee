import * as Scroll from '@radix-ui/react-scroll-area';
import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import styles from './ScrollArea.module.css';

type Props = ComponentPropsWithoutRef<typeof Scroll.Viewport> & {
  className?: string;
  axis?: 'vertical' | 'horizontal';
};

// Keep native wheel, touch and keyboard scrolling; draw our own rail and thumb.
export const ScrollArea = forwardRef<HTMLDivElement, Props>(function ScrollArea(
  { children, className = '', axis = 'vertical', ...viewportProps }, ref,
) {
  return (
    <Scroll.Root className={`${styles.root} ${className}`} type="auto">
      <Scroll.Viewport
        {...viewportProps}
        ref={ref}
        className={`${styles.viewport} ${axis === 'vertical' ? styles.vertical : styles.horizontal}`}
        tabIndex={viewportProps.tabIndex ?? 0}
      >
        {children}
      </Scroll.Viewport>
      <Scroll.Scrollbar className={styles.rail} orientation={axis}>
        <Scroll.Thumb className={styles.thumb} />
      </Scroll.Scrollbar>
    </Scroll.Root>
  );
});
