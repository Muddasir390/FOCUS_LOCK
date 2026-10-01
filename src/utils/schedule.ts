import type { DateOverride, Schedule } from '../native/FocusLock';

export const EMPTY_SCHEDULE: Schedule = {
  byDay: [0, 0, 0, 0, 0, 0, 0],
  overrides: [],
  dailyWindow: null,
};

/** "2026-10-01" in local time (matches the device-midnight "today" used everywhere else). */
export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Resolves the effective daily minute limit for `date`.
 *
 * KEPT IN SYNC WITH: android/app/src/main/java/com/focuslock/Schedule.kt -> effectiveMinutesFor().
 * Same rule, same variable names (today, overrides, byDay) -- if you change the logic here,
 * change it there too.
 *
 * Rule: find overrides whose inclusive [start, end] contains `date`. If more than one matches
 * (the UI prevents overlaps, but don't trust that), the LOWEST minutes wins -- i.e. the most
 * restrictive override applies, so a 0 ("fully blocked") override always beats a partial-limit
 * one on the same day. Otherwise fall back to byDay[date.getDay()].
 */
export function effectiveMinutesFor(schedule: Schedule, date: Date): number {
  const today = toIsoDate(date);
  const matching = schedule.overrides.filter(
    (o: DateOverride) => o.start <= today && today <= o.end,
  );
  if (matching.length > 0) return Math.min(...matching.map(o => o.minutes));
  return schedule.byDay[date.getDay()] ?? 0;
}

/** Whether this schedule restricts the app at all (a day limit, a date override, or a daily time window). */
export function hasAnyLimit(schedule: Schedule): boolean {
  return (
    schedule.byDay.some(m => m > 0) ||
    schedule.overrides.length > 0 ||
    schedule.dailyWindow != null
  );
}

/** Parses "HH:mm" into minutes since midnight, e.g. "07:30" -> 450. */
function minutesOfDay(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Whether `now`'s clock time falls inside `startTime`..`endTime` ("HH:mm", inclusive), handling
 * windows that cross midnight (e.g. "22:00".."07:00") where start > end in minutes-since-midnight.
 *
 * KEPT IN SYNC WITH: android/app/src/main/java/com/focuslock/Schedule.kt -> isWithinTimeWindow().
 * Same rule, same variable names (start, end, current) -- if you change the logic here, change it
 * there too.
 */
export function isWithinTimeWindow(startTime: string, endTime: string, now: Date): boolean {
  const start = minutesOfDay(startTime);
  const end = minutesOfDay(endTime);
  const current = now.getHours() * 60 + now.getMinutes();
  return start <= end ? current >= start && current <= end : current >= start || current <= end;
}

/**
 * Whether `schedule` blocks the app right now purely due to clock time, independent of any
 * minute budget. A true result means "block regardless of usage."
 *
 * KEPT IN SYNC WITH: android/app/src/main/java/com/focuslock/Schedule.kt -> isBlockedByTimeWindow().
 * Same rule, same variable names (today, dateOverrides, dailyWindow) -- if you change the logic
 * here, change it there too.
 *
 * Rule: any date override covering `now` with both startTime and endTime set takes over this
 * date's time-of-day rule completely (exactly like it takes over the date's minute budget in
 * effectiveMinutesFor) -- schedule.dailyWindow is not consulted on such a date even if none of
 * the matching overrides is currently active. Otherwise, schedule.dailyWindow (if any) applies.
 */
export function isBlockedByTimeWindow(schedule: Schedule, now: Date): boolean {
  const today = toIsoDate(now);
  const dateOverrides = schedule.overrides.filter(
    (o): o is DateOverride & { startTime: string; endTime: string } =>
      o.start <= today && today <= o.end && o.startTime != null && o.endTime != null,
  );
  if (dateOverrides.length > 0) {
    return dateOverrides.some(o => isWithinTimeWindow(o.startTime, o.endTime, now));
  }
  if (!schedule.dailyWindow) return false;
  return isWithinTimeWindow(schedule.dailyWindow.start, schedule.dailyWindow.end, now);
}
