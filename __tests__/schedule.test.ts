import {
  EMPTY_SCHEDULE,
  effectiveMinutesFor,
  hasAnyLimit,
  isBlockedByTimeWindow,
  isWithinTimeWindow,
  toIsoDate,
} from '../src/utils/schedule';
import type { Schedule } from '../src/native/FocusLock';

// A Thursday, chosen arbitrarily; Date.getDay() === 4.
const THURSDAY = new Date(2026, 9, 1);
const at = (hours: number, minutes: number) => new Date(2026, 9, 1, hours, minutes);

describe('effectiveMinutesFor', () => {
  it('falls back to byDay when there is no matching override', () => {
    const schedule: Schedule = {
      byDay: [0, 10, 20, 30, 40, 50, 60],
      overrides: [],
      dailyWindow: null,
    };
    expect(effectiveMinutesFor(schedule, THURSDAY)).toBe(40);
  });

  it('lets an override beat byDay inside its range', () => {
    const schedule: Schedule = {
      byDay: [0, 0, 0, 0, 40, 0, 0],
      overrides: [{ start: '2026-09-28', end: '2026-10-05', minutes: 5 }],
      dailyWindow: null,
    };
    expect(effectiveMinutesFor(schedule, THURSDAY)).toBe(5);
  });

  it('resolves overlapping overrides to the lower (more restrictive) value', () => {
    const schedule: Schedule = {
      byDay: [0, 0, 0, 0, 0, 0, 0],
      overrides: [
        { start: '2026-09-01', end: '2026-10-31', minutes: 20 },
        { start: '2026-10-01', end: '2026-10-01', minutes: 0 },
      ],
      dailyWindow: null,
    };
    expect(effectiveMinutesFor(schedule, THURSDAY)).toBe(0);
  });

  it('ignores overrides outside their range', () => {
    const schedule: Schedule = {
      byDay: [0, 0, 0, 0, 40, 0, 0],
      overrides: [{ start: '2026-11-01', end: '2026-11-05', minutes: 5 }],
      dailyWindow: null,
    };
    expect(effectiveMinutesFor(schedule, THURSDAY)).toBe(40);
  });
});

describe('hasAnyLimit', () => {
  it('is false for an empty schedule', () => {
    expect(hasAnyLimit(EMPTY_SCHEDULE)).toBe(false);
  });

  it('is true when any day has a limit', () => {
    expect(
      hasAnyLimit({ byDay: [0, 0, 0, 30, 0, 0, 0], overrides: [], dailyWindow: null }),
    ).toBe(true);
  });

  it('is true for an override even when its minutes is 0 (fully blocked)', () => {
    expect(
      hasAnyLimit({
        byDay: [0, 0, 0, 0, 0, 0, 0],
        overrides: [{ start: '2026-12-25', end: '2026-12-25', minutes: 0 }],
        dailyWindow: null,
      }),
    ).toBe(true);
  });

  it('is true for a dailyWindow-only schedule', () => {
    expect(
      hasAnyLimit({
        byDay: [0, 0, 0, 0, 0, 0, 0],
        overrides: [],
        dailyWindow: { start: '22:00', end: '07:00' },
      }),
    ).toBe(true);
  });
});

describe('toIsoDate', () => {
  it('zero-pads month and day', () => {
    expect(toIsoDate(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(toIsoDate(THURSDAY)).toBe('2026-10-01');
  });
});

describe('isWithinTimeWindow', () => {
  it('handles a normal same-day window', () => {
    expect(isWithinTimeWindow('09:00', '17:00', at(12, 0))).toBe(true);
    expect(isWithinTimeWindow('09:00', '17:00', at(18, 0))).toBe(false);
  });

  it('handles a window that wraps past midnight', () => {
    expect(isWithinTimeWindow('22:00', '07:00', at(23, 0))).toBe(true);
    expect(isWithinTimeWindow('22:00', '07:00', at(3, 0))).toBe(true);
    expect(isWithinTimeWindow('22:00', '07:00', at(12, 0))).toBe(false);
  });

  it('is inclusive at both boundaries', () => {
    expect(isWithinTimeWindow('22:00', '07:00', at(22, 0))).toBe(true);
    expect(isWithinTimeWindow('22:00', '07:00', at(7, 0))).toBe(true);
  });
});

describe('isBlockedByTimeWindow', () => {
  it('uses the standalone dailyWindow when there is no date override', () => {
    const schedule: Schedule = {
      byDay: [0, 0, 0, 0, 0, 0, 0],
      overrides: [],
      dailyWindow: { start: '22:00', end: '07:00' },
    };
    expect(isBlockedByTimeWindow(schedule, at(23, 0))).toBe(true);
    expect(isBlockedByTimeWindow(schedule, at(12, 0))).toBe(false);
  });

  it('lets a same-day time-component override fully replace dailyWindow, even while the override itself is inactive', () => {
    const schedule: Schedule = {
      byDay: [0, 0, 0, 0, 0, 0, 0],
      overrides: [{ start: '2026-10-01', end: '2026-10-01', minutes: 10, startTime: '14:00', endTime: '18:00' }],
      dailyWindow: { start: '22:00', end: '07:00' },
    };
    // 23:00 is inside dailyWindow, but today's override (which doesn't cover 23:00) takes over entirely.
    expect(isBlockedByTimeWindow(schedule, at(23, 0))).toBe(false);
    // Inside the override's own window, it blocks.
    expect(isBlockedByTimeWindow(schedule, at(15, 0))).toBe(true);
  });

  it('ignores a date override with no time component (all-day minute limit only)', () => {
    const schedule: Schedule = {
      byDay: [0, 0, 0, 0, 0, 0, 0],
      overrides: [{ start: '2026-10-01', end: '2026-10-01', minutes: 10 }],
      dailyWindow: { start: '22:00', end: '07:00' },
    };
    expect(isBlockedByTimeWindow(schedule, at(23, 0))).toBe(true);
  });
});
