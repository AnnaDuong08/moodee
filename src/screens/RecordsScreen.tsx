// Records: "What are you studying?"에서 고른 주제별 집중 시간(포스트잇: 2h coding, 3h chem, 1h reading)
import { motion } from 'framer-motion';
import { BackIcon, FlameIcon } from '../components/Icons';
import { screenMotion } from '../lib/motion';
import { fmtMinutes, listSessions, weekByDay, weekBySubject } from '../lib/sessions';
import { readStreak } from '../lib/streak';
import styles from './RecordsScreen.module.css';

interface Props {
  onBack: () => void;
  onStudy: () => void;
}

// 주제별 막대 색(토큰 팔레트 순환)
const COLORS = ['#9F88C4', '#E8955A', '#9BAE8C', '#F2C46B', '#6E86D8', '#E9A3B0'];

export function RecordsScreen({ onBack, onStudy }: Props) {
  const subjects = weekBySubject();
  const days = weekByDay();
  const total = subjects.reduce((s, x) => s + x.minutes, 0);
  const maxSubject = Math.max(1, ...subjects.map((s) => s.minutes));
  const maxDay = Math.max(1, ...days.map((d) => d.minutes));
  const recent = [...listSessions()].sort((a, b) => b.endedAt.localeCompare(a.endedAt)).slice(0, 5);
  const streak = readStreak();

  return (
    <motion.main className={`screen ${styles.records}`} {...screenMotion}>
      <header className={styles.top}>
        <button type="button" className="icon-btn" onClick={onBack} aria-label="Back to home">
          <BackIcon />
        </button>
        <h1>Records</h1>
        <span className={styles.spacer} />
      </header>

      <div className={styles.scroll}>
        <div className={styles.stats}>
          <div>
            <b>{fmtMinutes(total)}</b>
            <span>this week</span>
          </div>
          <div>
            <b>
              <FlameIcon width={18} height={18} className={styles.flame} /> {streak.count}
            </b>
            <span>day streak</span>
          </div>
          <div>
            <b>{streak.totalSessions}</b>
            <span>sessions</span>
          </div>
        </div>

        {subjects.length === 0 ? (
          <section className={styles.empty}>
            <h2>Nothing here yet</h2>
            <p>Pick what you’re studying before a session, and the time lands here by subject.</p>
            <button type="button" className="pill pill-primary" onClick={onStudy}>
              Start a session
            </button>
          </section>
        ) : (
          <>
            <section className={styles.card}>
              <h2>By subject · last 7 days</h2>
              <ul className={styles.bars}>
                {subjects.map((s, i) => (
                  <li key={s.subject}>
                    <div className={styles.barHead}>
                      <b>{s.subject}</b>
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
              <h2>By day</h2>
              <div className={styles.days} role="img" aria-label={days.map((d) => `${d.label} ${d.minutes} minutes`).join(', ')}>
                {days.map((d, i) => (
                  <div key={d.key} className={styles.day}>
                    <div className={styles.col}>
                      <div className={`${styles.colFill} ${i === days.length - 1 ? styles.today : ''}`} style={{ height: `${d.minutes ? Math.max(8, (d.minutes / maxDay) * 100) : 0}%` }} />
                    </div>
                    <span>{d.label}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className={styles.card}>
              <h2>Recent sessions</h2>
              <ul className={styles.recent}>
                {recent.map((s) => (
                  <li key={s.id}>
                    <b>{s.subject}</b>
                    <span>
                      {fmtMinutes(s.minutes)} · {new Date(s.endedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      {s.seat && ` · seat ${s.seat}`}
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
