import type { AgendaEvent, StudyPlan } from './calendar';

export interface SessionAgendaChoice {
  id: string;
  calendarId: string;
  calendarName: string;
  title: string;
  startsAt: string;
}

function timestamp(value: string): number {
  // Google all-day events use date-only values with an exclusive end date.
  return new Date(value.includes('T') ? value : `${value}T00:00:00`).getTime();
}

export function agendaChoicesForDate(date: string, plans: StudyPlan[], events: AgendaEvent[]): SessionAgendaChoice[] {
  const start = new Date(`${date}T00:00:00`).getTime();
  const end = new Date(`${date}T00:00:00`);
  end.setDate(end.getDate() + 1);
  const dayEnd = end.getTime();
  const overlapsDay = (startsAt: string, endsAt: string) => timestamp(startsAt) < dayEnd && timestamp(endsAt) > start;

  const local = plans.filter((plan) => overlapsDay(plan.startsAt, new Date(timestamp(plan.startsAt) + plan.durationMinutes * 60_000).toISOString()))
    .map((plan) => ({ id: plan.id, calendarId: 'local', calendarName: 'MOODEE plan', title: plan.title, startsAt: plan.startsAt }));
  const google = events.filter((event) => overlapsDay(event.startsAt, event.endsAt))
    .map((event) => ({ id: event.id, calendarId: event.calendarId, calendarName: event.calendarName, title: event.title, startsAt: event.startsAt }));

  return [...local, ...google].sort((a, b) => timestamp(a.startsAt) - timestamp(b.startsAt) || a.title.localeCompare(b.title));
}
