// Records: focus time per topic chosen in "What are you studying?" (sticky note: 2h coding, 3h chem, 1h reading)
import { motion } from 'framer-motion';
import { BackIcon, FlameIcon } from '../components/Icons';
import { useLang, useT } from '../i18n';
import { screenMotion } from '../lib/motion';
import { fmtMinutes, listSessions, weekByDay, weekBySubject } from '../lib/sessions';
import { readStreak } from '../lib/streak';
import styles from './RecordsScreen.module.css';

interface Props {
  onBack: () => void;
  onStudy: () => void;
}

// Bar color per topic (cycles through the token palette)
const COLORS = ['#9F88C4', '#E8955A', '#9BAE8C', '#F2C46B', '#6E86D8', '#E9A3B0'];

export function RecordsScreen({ onBack, onStudy }: Props) {
  const subjects = weekBySubject();
  const days = weekByDay();
  const total = subjects.reduce((s, x) => s + x.minutes, 0);
  const maxSubject = Math.max(1, ...subjects.map((s) => s.minutes));
  const maxDay = Math.max(1, ...days.map((d) => d.minutes));
  const recent = [...listSessions()].sort((a, b) => b.endedAt.localeCompare(a.endedAt)).slice(0, 5);
  const streak = readStreak();
  const t = useT();
  const lang = useLang();
  const weekday = (key: string) => new Date(`${key}T12:00:00`).toLocaleDateString(lang, { weekday: 'narrow' });

  return (
    <motion.main className={`screen ${styles.records}`} {...screenMotion}>
      <header className={styles.top}>
        <button type="button" className="icon-btn" onClick={onBack} aria-label={t('Back to home')}>
          <BackIcon />
        </button>
        <h1>{t('Records')}</h1>
        <span className={styles.spacer} />
      </header>

      <div className={styles.scroll}>
        <div className={styles.stats}>
          <div>
            <b>{fmtMinutes(total)}</b>
            <span>{t('this week')}</span>
          </div>
          <div>
            <b>
              <FlameIcon width={18} height={18} className={styles.flame} /> {streak.count}
            </b>
            <span>{t('day streak')}</span>
          </div>
          <div>
            <b>{streak.totalSessions}</b>
            <span>{t('sessions')}</span>
          </div>
        </div>

        {subjects.length === 0 ? (
          <section className={styles.empty}>
            <h2>{t('Nothing here yet')}</h2>
            <p>{t('Pick what you’re studying before a session, and the time lands here by subject.')}</p>
            <button type="button" className="pill pill-primary" onClick={onStudy}>
              {t('Start a session')}
            </button>
          </section>
        ) : (
          <>
            <section className={styles.card}>
              <h2>{t('By subject · last 7 days')}</h2>
              <ul className={styles.bars}>
                {subjects.map((s, i) => (
                  <li key={s.subject}>
                    <div className={styles.barHead}>
                      <b>{t(s.subject)}</b>
                      <span>{fmtMinutes(s.minutes)}</span>
                    </div>
                    <div className={styles.track}>
                      <motion.div
                        className={styles.fill}
                        style={{ background: COLORS[i % COLORS.length] }}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max(4, (s.minutes / maxSubject) * 100)}%` }}
                        transition={{ duration: 0.6, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section className={styles.card}>
              <h2>{t('By day')}</h2>
              <div className={styles.days} role="img" aria-label={days.map((d) => `${weekday(d.key)} ${t('{n} min', { n: d.minutes })}`).join(', ')}>
                {days.map((d, i) => (
                  <div key={d.key} className={styles.day}>
                    <div className={styles.col}>
                      <div className={`${styles.colFill} ${i === days.length - 1 ? styles.today : ''}`} style={{ height: `${d.minutes ? Math.max(8, (d.minutes / maxDay) * 100) : 0}%` }} />
                    </div>
                    <span>{weekday(d.key)}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className={styles.card}>
              <h2>{t('Recent sessions')}</h2>
              <ul className={styles.recent}>
                {recent.map((s) => (
                  <li key={s.id}>
                    <b>{t(s.subject)}</b>
                    <span>
                      {fmtMinutes(s.minutes)} · {new Date(s.endedAt).toLocaleDateString(lang, { month: 'short', day: 'numeric' })}
                      {s.seat && ` · ${t('seat {n}', { n: s.seat })}`}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </div>
    </motion.main>
  );
}
