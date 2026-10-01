import {
  LIMIT_STEPS,
  formatDuration,
  formatMinutes,
  stepLimit,
} from '../src/utils/time';

describe('formatMinutes', () => {
  it('formats minutes, hours and both', () => {
    expect(formatMinutes(1)).toBe('1m');
    expect(formatMinutes(45)).toBe('45m');
    expect(formatMinutes(120)).toBe('2h');
    expect(formatMinutes(90)).toBe('1h 30m');
  });
});

describe('formatDuration', () => {
  it('shows "<1m" for a few seconds and rounds down otherwise', () => {
    expect(formatDuration(0)).toBe('0m');
    expect(formatDuration(20_000)).toBe('<1m');
    expect(formatDuration(5 * 60_000 + 59_000)).toBe('5m');
    expect(formatDuration(65 * 60_000)).toBe('1h 5m');
  });
});

describe('stepLimit', () => {
  it('walks up and down the allowed limits', () => {
    expect(stepLimit(30, 1)).toBe(35);
    expect(stepLimit(30, -1)).toBe(25);
    expect(stepLimit(60, 1)).toBe(75);
    expect(stepLimit(5, -1)).toBe(1);
  });

  it('stops at both ends', () => {
    expect(stepLimit(1, -1)).toBe(1);
    expect(stepLimit(1440, 1)).toBe(1440);
  });

  it('is sorted and unique so stepping never loops', () => {
    expect([...LIMIT_STEPS].sort((a, b) => a - b)).toEqual(LIMIT_STEPS);
    expect(new Set(LIMIT_STEPS).size).toBe(LIMIT_STEPS.length);
  });
});
