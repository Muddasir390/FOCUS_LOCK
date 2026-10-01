const range = (from: number, to: number, step: number) =>
  Array.from(
    { length: Math.floor((to - from) / step) + 1 },
    (_, i) => from + i * step,
  );

/** Limits the user can pick, in minutes: fine steps for short limits, coarser for long ones. */
export const LIMIT_STEPS: number[] = [
  1,
  ...range(5, 60, 5),
  ...range(75, 180, 15),
  ...range(210, 480, 30),
  ...range(540, 1440, 60),
];

/** Moves to the next (+1) or previous (-1) allowed limit. */
export function stepLimit(current: number, direction: 1 | -1): number {
  if (direction === 1) {
    return (
      LIMIT_STEPS.find(step => step > current) ??
      LIMIT_STEPS[LIMIT_STEPS.length - 1]
    );
  }
  const lower = [...LIMIT_STEPS].reverse().find(step => step < current);
  return lower ?? LIMIT_STEPS[0];
}

/** 90 -> "1h 30m", 45 -> "45m", 120 -> "2h". */
export function formatMinutes(total: number): string {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (hours === 0) {
    return `${minutes}m`;
  }
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}

/** Milliseconds as a short duration; anything under a minute shows as "<1m". */
export function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60_000);
  if (ms > 0 && minutes === 0) {
    return '<1m';
  }
  return formatMinutes(minutes);
}

/** "HH:mm" -> a Date carrying that time today (only the hours/minutes are meaningful). */
export function hhmmToDate(hhmm: string): Date {
  const [hours, minutes] = hhmm.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

/** A Date's local time as "HH:mm", zero-padded. */
export function dateToHHmm(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/** "HH:mm" as a 12-hour label, e.g. "07:00" -> "7:00 AM", "14:30" -> "2:30 PM". */
export function formatTimeLabel(hhmm: string): string {
  const [hours, minutes] = hhmm.split(':').map(Number);
  const period = hours < 12 ? 'AM' : 'PM';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return minutes === 0 ? `${hour12} ${period}` : `${hour12}:${String(minutes).padStart(2, '0')} ${period}`;
}
