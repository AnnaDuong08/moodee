import { motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { BackIcon } from '../components/Icons';
import { addDays, clearAccountCalendarCache, getWeekDays, guestPlans, localDate, migrateUpcomingPlans, type AgendaEvent, type PlanInput, type ReminderMinutes } from '../lib/calendar';
import { beginGoogleConnection, CalendarRequestError, connectionStatus, createGooglePlan, currentAccountId, deleteGooglePlan, disconnectGoogle, googleConfigured, listGoogleAgenda, updateGooglePlan } from '../lib/googleConnection';
import { getLang, tr, useLang, useT } from '../i18n';
import { screenMotion } from '../lib/motion';
import { loadValue, save } from '../lib/storage';
import styles from './CalendarScreen.module.css';

interface Props {
  initialMessage?: string;
  connectionRevision?: number;
  onBack: () => void;
  onStart: (title: string, eventId: string, date: string) => void;
}

type FormState = { title: string; date: string; time: string; durationMinutes: number; reminderMinutes: ReminderMinutes };
const reminderOptions: { value: ReminderMinutes; label: string }[] = [
  { value: null, label: 'Off' }, { value: 0, label: 'At start' }, { value: 10, label: '{n} min' }, { value: 30, label: '{n} min' }, { value: 60, label: '{n} min' },
];

function localEvent(plan: ReturnType<typeof guestPlans.list>[number]): AgendaEvent {
  return { id: plan.id, calendarId: 'local', calendarName: 'On this device', title: plan.title, startsAt: plan.startsAt, endsAt: new Date(new Date(plan.startsAt).getTime() + plan.durationMinutes * 60_000).toISOString(), source: 'moodie', readOnly: false, reminderMinutes: plan.reminderMinutes };
}

function initialForm(date: Date): FormState {
  return { title: '', date: localDate(date), time: '09:00', durationMinutes: 25, reminderMinutes: 10 };
}

function formFromEvent(event: AgendaEvent): FormState {
  const start = new Date(event.startsAt);
  const end = new Date(event.endsAt);
  return { title: event.title, date: localDate(start), time: `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`, durationMinutes: Math.max(1, Math.round((end.getTime() - start.getTime()) / 60_000)), reminderMinutes: event.reminderMinutes ?? null };
}

function formatTime(value: string): string {
  if (!value.includes('T')) return tr('All day');
  return new Date(value).toLocaleTimeString(getLang(), { hour: '2-digit', minute: '2-digit' });
}

function eventDate(value: string): string {
  return value.includes('T') ? localDate(new Date(value)) : value;
}

function guestReminder(event: AgendaEvent, now: number): string {
  if (event.reminderMinutes === null || event.reminderMinutes === undefined) return tr('Reminder off');
  const start = new Date(event.startsAt).getTime();
  const due = start - event.reminderMinutes * 60_000;
  return now >= due && now < start ? tr('Reminder due · in game') : `${event.reminderMinutes === 0 ? tr('At start') : tr('{n} min before', { n: event.reminderMinutes })} · ${tr('in game only')}`;
}

function weekTitle(days: Date[]): string {
  const first = days[0];
  const last = days[6];
  const lang = getLang();
  if (first.getMonth() === last.getMonth()) return first.toLocaleDateString(lang, { month: 'long', year: 'numeric' });
  const firstPart = first.toLocaleDateString(lang, { month: 'short', ...(first.getFullYear() !== last.getFullYear() ? { year: 'numeric' } : {}) });
  return `${firstPart} – ${last.toLocaleDateString(lang, { month: 'short', year: 'numeric' })}`;
}

export function CalendarScreen({ initialMessage = '', connectionRevision = 0, onBack, onStart }: Props) {
  const t = useT();
  const lang = useLang();
  const [week, setWeek] = useState(() => getWeekDays(new Date())[0]);
  const [selectedDate, setSelectedDate] = useState(() => localDate(new Date()));
  const [localPlans, setLocalPlans] = useState(guestPlans.list);
  const [remoteEvents, setRemoteEvents] = useState<AgendaEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [checkingConnection, setCheckingConnection] = useState(googleConfigured);
  const [email, setEmail] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(initialMessage);
  const [editing, setEditing] = useState<AgendaEvent | null | 'new'>(null);
  const [form, setForm] = useState<FormState>(() => initialForm(new Date()));
  const [now, setNow] = useState(Date.now());

  const weekKey = localDate(week);
  const cacheKey = accountId ? `calendarCache:${accountId}:${weekKey}` : '';

  const refresh = useCallback(async () => {
    if (!connected || !accountId) return;
    setBusy(true);
    try {
      const events = await listGoogleAgenda(week.toISOString(), addDays(week, 7).toISOString());
      setRemoteEvents(events);
      save(`calendarCache:${accountId}:${localDate(week)}`, events);
      setOffline(false);
      setMessage('');
    } catch (error) {
      setRemoteEvents(loadValue<AgendaEvent[]>(`calendarCache:${accountId}:${localDate(week)}`, []));
      setOffline(true);
      setMessage(error instanceof Error ? error.message : t('Calendar is unavailable.'));
    } finally { setBusy(false); }
  }, [accountId, connected, week]);

  useEffect(() => {
    let active = true;
    setCheckingConnection(true);
    (async () => {
      const id = await currentAccountId();
      if (!active) return;
      if (!id) {
        setAccountId(null);
        setConnected(false);
        setEmail(null);
        setCheckingConnection(false);
        return;
      }
      setAccountId(id);
      try {
        const status = await connectionStatus();
        if (!active) return;
        setConnected(status.connected);
        setEmail(status.email);
        save(`calendarConnected:${id}`, status);
      } catch (error) {
        if (!active) return;
        const cached = loadValue<{ connected: boolean; email: string | null }>(`calendarConnected:${id}`, { connected: false, email: null });
        setConnected(cached.connected);
        setEmail(cached.email);
        setOffline(true);
        setMessage(error instanceof Error ? error.message : t('Calendar is unavailable.'));
      } finally {
        if (active) setCheckingConnection(false);
      }
    })();
    return () => { active = false; };
  }, [connectionRevision]);

  useEffect(() => {
    if (!connected || !accountId) return;
    setRemoteEvents(loadValue<AgendaEvent[]>(cacheKey, []));
    void refresh();
  }, [connected, accountId, cacheKey, refresh]);

  useEffect(() => {
    const foreground = () => { if (document.visibilityState === 'visible') void refresh(); };
    const focus = () => void refresh();
    document.addEventListener('visibilitychange', foreground);
    window.addEventListener('focus', focus);
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => { document.removeEventListener('visibilitychange', foreground); window.removeEventListener('focus', focus); window.clearInterval(timer); };
  }, [refresh]);

  useEffect(() => { if (connected && offline) setEditing(null); }, [connected, offline]);

  const weekDays = useMemo(() => getWeekDays(week), [week]);
  const events = useMemo(() => [...remoteEvents, ...localPlans.map(localEvent)].filter((event) => eventDate(event.startsAt) === selectedDate).sort((a, b) => a.startsAt.localeCompare(b.startsAt)), [remoteEvents, localPlans, selectedDate]);
  const upcomingGuestCount = localPlans.filter((plan) => new Date(plan.startsAt).getTime() >= now).length;

  const shiftWeek = (count: number) => {
    const next = addDays(week, count * 7);
    setWeek(next);
    setSelectedDate(localDate(next));
  };

  const openNew = () => { setEditing('new'); setForm(initialForm(new Date(`${selectedDate}T09:00:00`))); setMessage(''); };
  const openEdit = (event: AgendaEvent) => { if (event.readOnly || offline) return; setEditing(event); setForm(formFromEvent(event)); setMessage(''); };

  const saveForm = async (submit: React.FormEvent) => {
    submit.preventDefault();
    const title = form.title.trim();
    const start = new Date(`${form.date}T${form.time}:00`);
    if (!title || !Number.isFinite(start.getTime()) || form.durationMinutes < 1 || form.durationMinutes > 720) { setMessage(t('Add a goal, date, time, and duration from 1 to 720 minutes.')); return; }
    const input: PlanInput = { title, startsAt: start.toISOString(), durationMinutes: form.durationMinutes, reminderMinutes: form.reminderMinutes };
    setBusy(true);
    try {
      if (!connected) {
        if (editing === 'new') guestPlans.create(input);
        else if (editing) guestPlans.update(editing.id, input);
        setLocalPlans(guestPlans.list());
      } else if (editing === 'new') {
        await createGooglePlan({ id: crypto.randomUUID(), ...input });
        await refresh();
      } else if (editing) {
        if (editing.calendarId === 'local') {
          guestPlans.update(editing.id, input);
          setLocalPlans(guestPlans.list());
        } else {
          await updateGooglePlan(editing, input);
          await refresh();
        }
      }
      setSelectedDate(form.date);
      setWeek(getWeekDays(start)[0]);
      setEditing(null);
      setMessage(t('Plan saved.'));
    } catch (error) {
      if (error instanceof CalendarRequestError && error.code === 'conflict') { setEditing(null); await refresh(); }
      if (error instanceof CalendarRequestError && error.code !== 'conflict') setOffline(true);
      setMessage(error instanceof Error ? error.message : t('Could not save plan.'));
    } finally { setBusy(false); }
  };

  const remove = async (event: AgendaEvent) => {
    if (event.readOnly || offline) return;
    setBusy(true);
    try {
      if (event.calendarId === 'local') { guestPlans.remove(event.id); setLocalPlans(guestPlans.list()); }
      else { await deleteGooglePlan(event); await refresh(); }
      setEditing(null);
      setMessage(t('Plan removed.'));
    } catch (error) {
      if (error instanceof CalendarRequestError && error.code === 'conflict') { setEditing(null); await refresh(); }
      if (error instanceof CalendarRequestError && error.code !== 'conflict') setOffline(true);
      setMessage(error instanceof Error ? error.message : t('Could not remove plan.'));
    } finally { setBusy(false); }
  };

  const migrate = async () => {
    setBusy(true);
    const result = await migrateUpcomingPlans(localPlans, (plan) => createGooglePlan(plan), new Date());
    setLocalPlans(guestPlans.list());
    await refresh();
    setBusy(false);
    setMessage(`${t(result.migrated === 1 ? '{n} plan moved to Google Calendar.' : '{n} plans moved to Google Calendar.', { n: result.migrated })}${result.failed ? ` ${t('{n} stayed on this device; retry later.', { n: result.failed })}` : ''}`);
  };

  const disconnect = async () => {
    setBusy(true);
    try {
      await disconnectGoogle();
      if (accountId) clearAccountCalendarCache(accountId);
      setConnected(false); setEmail(null); setAccountId(null); setRemoteEvents([]); setOffline(false);
      setMessage(t('Google Calendar disconnected. Existing Google events remain in Google Calendar.'));
    } catch (error) { setMessage(error instanceof Error ? error.message : t('Could not disconnect.')); }
    finally { setBusy(false); }
  };

  return (
    <motion.main className={`screen ${styles.screen}`} {...screenMotion}>
      <header className={styles.header}>
        <button type="button" className="icon-btn" onClick={onBack} aria-label={t('Back')}><BackIcon /></button>
        <div><span className={styles.eyebrow}>{t('Make space for your plans')}</span><h1>{t('Calendar')}</h1></div>
        <button type="button" className={styles.refresh} onClick={() => void refresh()} disabled={!connected || busy} aria-label={t('Refresh agenda')}>↻</button>
      </header>
      <div className={styles.scroll}>
        <section className={styles.connection} aria-label={t('Google Calendar connection')}>
          {checkingConnection ? <><div><b>{t('Checking Google Calendar…')}</b><span>{t('Getting your connection ready.')}</span></div><button type="button" disabled>{t('Checking…')}</button></>
            : connected ? <><div><b>{t('Google Calendar connected')}</b><span>{email}</span></div><button type="button" onClick={() => void disconnect()} disabled={busy}>{t('Disconnect')}</button></>
            : <><div><b>{t('Plans on this device')}</b><span>{t('Connect Google for reminders outside MOODEE.')}</span></div><button type="button" onClick={() => void beginGoogleConnection().catch((error) => setMessage(error.message))} disabled={!googleConfigured}>{t(googleConfigured ? 'Connect' : 'Setup needed')}</button></>}
        </section>
        {connected && upcomingGuestCount > 0 && <section className={styles.migration}><b>{t('Bring your plans along?')}</b><p>{t(upcomingGuestCount === 1 ? '{n} upcoming plan on this device can move to Google Calendar.' : '{n} upcoming plans on this device can move to Google Calendar.', { n: upcomingGuestCount })}</p><button type="button" onClick={() => void migrate()} disabled={busy || offline}>{t('Move upcoming plans')}</button></section>}
        {offline && <div className={styles.offline} role="status">{t('Offline or Google access expired. Last saved agenda is read only.')} <button type="button" onClick={() => void refresh()} disabled={busy}>{t('Try again')}</button> <button type="button" onClick={() => void beginGoogleConnection().catch((error) => setMessage(error.message))}>{t('Reconnect Google')}</button></div>}
        {message && <p className={styles.message} role="status">{message}</p>}
        <section className={styles.weekCard} aria-label={t('Weekly calendar')}>
          <div className={styles.weekHeader}><button type="button" onClick={() => shiftWeek(-1)} aria-label={t('Previous week')}>‹</button><h2>{weekTitle(weekDays)}</h2><button type="button" onClick={() => shiftWeek(1)} aria-label={t('Next week')}>›</button></div>
          <div className={styles.days}>{weekDays.map((day) => { const key = localDate(day); return <button key={key} type="button" className={key === selectedDate ? styles.selectedDay : ''} onClick={() => setSelectedDate(key)} aria-pressed={key === selectedDate}><span>{day.toLocaleDateString(lang, { weekday: 'short' })}</span><b>{day.getDate()}</b></button>; })}</div>
        </section>
        <div className={styles.agendaHead}><div><span className={styles.eyebrow}>{t('Your day')}</span><h2>{new Date(`${selectedDate}T12:00:00`).toLocaleDateString(lang, { weekday: 'long', month: 'short', day: 'numeric' })}</h2></div><button type="button" onClick={openNew} disabled={busy || (connected && offline)} aria-label={t('New plan')}>+ {t('New plan')}</button></div>
        <div className={styles.agenda}>
          {events.length === 0 && <div className={styles.empty}>{t('A little room for something new.')} ✦</div>}
          {events.map((event) => <article className={styles.event} key={`${event.calendarId}:${event.id}`}>
            <div className={styles.eventTime}>{formatTime(event.startsAt)}</div>
            <div className={styles.eventBody}><span className={styles.eventSource}>{t(event.calendarName)}{event.calendarId === 'local' ? ` · ${t('local')}` : ''}</span><h3>{event.title}</h3><p>{event.calendarId === 'local' ? guestReminder(event, now) : event.readOnly ? t('From Google Calendar · read only') : event.reminderMinutes === null ? t('Reminder off') : `${t('Popup + email')} · ${t('{n} min before', { n: event.reminderMinutes ?? 0 })}`}</p>
              <div className={styles.eventActions}><button type="button" onClick={() => onStart(event.title, event.id, eventDate(event.startsAt))} aria-label={t('Start {title}', { title: event.title })}>{t('Use as one thing')} ↗</button>{!event.readOnly && !offline && <button type="button" onClick={() => openEdit(event)} aria-label={t('Edit {title}', { title: event.title })}>{t('Edit')}</button>}</div>
            </div>
          </article>)}
        </div>
      </div>
      {editing && <div className={styles.formBackdrop}><form className={styles.formCard} onSubmit={(event) => void saveForm(event)} aria-label={t(editing === 'new' ? 'New plan' : 'Edit plan')}>
        <div className={styles.formTitle}><h2>{t(editing === 'new' ? 'A new study plan' : 'Edit study plan')}</h2><button type="button" onClick={() => setEditing(null)} aria-label={t('Close plan form')}>×</button></div>
        <label>{t('What will you do?')}<input autoFocus value={form.title} maxLength={300} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder={t('e.g. Read chapter 4')} /></label>
        <div className={styles.formRow}><label>{t('Date')}<input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} required /></label><label>{t('Time')}<input type="time" value={form.time} onChange={(event) => setForm({ ...form, time: event.target.value })} required /></label></div>
        <label>{t('Duration (minutes)')}<input type="number" min="1" max="720" value={form.durationMinutes} onChange={(event) => setForm({ ...form, durationMinutes: Number(event.target.value) })} required /></label>
        <label>{t('Remind me')}<select value={form.reminderMinutes === null ? 'off' : String(form.reminderMinutes)} onChange={(event) => setForm({ ...form, reminderMinutes: event.target.value === 'off' ? null : Number(event.target.value) as ReminderMinutes })}>{reminderOptions.map((option) => <option key={String(option.value)} value={option.value === null ? 'off' : option.value}>{t(option.label, { n: option.value ?? 0 })}</option>)}</select></label>
        <p className={styles.formHint}>{t(connected ? 'Google Calendar sends popup and email reminders, depending on your Google and device settings.' : 'Guest reminders are shown only while MOODEE is open.')}</p>
        <div className={styles.formActions}>{editing !== 'new' && <button type="button" onClick={() => void remove(editing)} disabled={busy}>{t('Delete')}</button>}<button type="submit" className="pill pill-primary" disabled={busy}>{t('Save plan')}</button></div>
      </form></div>}
    </motion.main>
  );
}
