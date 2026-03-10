import { describe, it, expect } from 'vitest';
import { buildRRule, computeNextSendAt, parseScheduleFromRRule } from '../rrule';

describe('buildRRule', () => {
  it('builds a valid RRULE string', () => {
    const result = buildRRule(['MO', 'WE', 'FR'], 6, 0);
    expect(result).toBe('FREQ=WEEKLY;BYDAY=MO,WE,FR;BYHOUR=6;BYMINUTE=0;BYSECOND=0');
  });

  it('handles single day', () => {
    const result = buildRRule(['TU'], 14, 30);
    expect(result).toBe('FREQ=WEEKLY;BYDAY=TU;BYHOUR=14;BYMINUTE=30;BYSECOND=0');
  });

  it('handles all days', () => {
    const result = buildRRule(['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'], 8, 0);
    expect(result).toContain('BYDAY=MO,TU,WE,TH,FR,SA,SU');
  });

  it('uppercases day codes', () => {
    const result = buildRRule(['mo', 'we'], 6, 0);
    expect(result).toContain('BYDAY=MO,WE');
  });
});

describe('parseScheduleFromRRule', () => {
  it('parses days, hour, minute from RRULE string', () => {
    const schedule = parseScheduleFromRRule(
      'FREQ=WEEKLY;BYDAY=MO,WE,FR;BYHOUR=6;BYMINUTE=0;BYSECOND=0'
    );
    expect(schedule.days).toEqual(['MO', 'WE', 'FR']);
    expect(schedule.hour).toBe(6);
    expect(schedule.minute).toBe(0);
  });

  it('handles afternoon time', () => {
    const schedule = parseScheduleFromRRule(
      'FREQ=WEEKLY;BYDAY=TU,TH;BYHOUR=17;BYMINUTE=30;BYSECOND=0'
    );
    expect(schedule.days).toEqual(['TU', 'TH']);
    expect(schedule.hour).toBe(17);
    expect(schedule.minute).toBe(30);
  });
});

describe('computeNextSendAt', () => {
  it('returns a future date', () => {
    const rrule = 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR,SA,SU;BYHOUR=6;BYMINUTE=0;BYSECOND=0';
    const next = computeNextSendAt(rrule, 'America/Indiana/Indianapolis');
    expect(next).toBeInstanceOf(Date);
    // Should be in the future or very close to now
    expect(next.getTime()).toBeGreaterThan(Date.now() - 86400000);
  });

  it('returns a Date object', () => {
    const rrule = 'FREQ=WEEKLY;BYDAY=MO;BYHOUR=8;BYMINUTE=0;BYSECOND=0';
    const result = computeNextSendAt(rrule, 'America/New_York');
    expect(result).toBeInstanceOf(Date);
  });
});
