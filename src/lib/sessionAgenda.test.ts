import { expect, it } from 'vitest';
import { agendaChoicesForDate } from './sessionAgenda';
import type { AgendaEvent, StudyPlan } from './calendar';

it('offers only events overlapping the chosen local day, including all-day Google events', () => {
  const plan: StudyPlan = { id: 'local', source: 'local', title: 'Write report', startsAt: new Date('2026-10-01T09:00:00').toISOString(), durationMinutes: 25, reminderMinutes: 10 };
  const allDay: AgendaEvent = { id: 'all-day', calendarId: 'personal', calendarName: 'Personal', title: 'Project day', startsAt: '2026-10-01', endsAt: '2026-10-02', source: 'google', readOnly: true };
  const tomorrow: AgendaEvent = { ...allDay, id: 'tomorrow', title: 'Tomorrow', startsAt: '2026-10-02', endsAt: '2026-10-03' };
  expect(agendaChoicesForDate('2026-10-01', [plan], [allDay, tomorrow]).map((choice) => choice.title)).toEqual(['Project day', 'Write report']);
});
