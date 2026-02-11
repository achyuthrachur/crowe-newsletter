/**
 * Shared RRULE helpers for schedule parsing and computation.
 * Used by intake route, prefs route, and sendDueEmails job.
 */

const DAY_MAP: Record<string, number> = {
  SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6,
};

/**
 * Parse an RFC 5545 RRULE string into days/hour/minute.
 */
export function parseRrule(rrule: string): { days: string[]; hour: number; minute: number } {
  const days: string[] = [];
  let hour = 6;
  let minute = 0;

  const byDayMatch = rrule.match(/BYDAY=([^;]+)/);
  if (byDayMatch) {
    days.push(...byDayMatch[1].split(','));
  }

  const byHourMatch = rrule.match(/BYHOUR=(\d+)/);
  if (byHourMatch) hour = parseInt(byHourMatch[1]);

  const byMinuteMatch = rrule.match(/BYMINUTE=(\d+)/);
  if (byMinuteMatch) minute = parseInt(byMinuteMatch[1]);

  return { days, hour, minute };
}

/**
 * Build an RFC 5545 RRULE string from days/hour/minute.
 */
export function buildRrule(days: string[], hour: number, minute: number): string {
  return `FREQ=WEEKLY;BYDAY=${days.join(',')};BYHOUR=${hour};BYMINUTE=${minute};BYSECOND=0`;
}

/**
 * Compute the next send time from days/hour/minute.
 */
export function computeNextSend(days: string[], hour: number, minute: number): Date {
  const now = new Date();
  const targetDays = days.map((d) => DAY_MAP[d]).filter((d) => d !== undefined).sort();

  if (targetDays.length === 0) {
    const next = new Date(now);
    next.setDate(next.getDate() + 1);
    next.setHours(hour, minute, 0, 0);
    return next;
  }

  const currentDay = now.getDay();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const targetMinutes = hour * 60 + minute;

  for (let offset = 0; offset < 7; offset++) {
    const candidateDay = (currentDay + offset) % 7;
    if (targetDays.includes(candidateDay)) {
      if (offset === 0 && currentMinutes >= targetMinutes) continue;
      const next = new Date(now);
      next.setDate(next.getDate() + offset);
      next.setHours(hour, minute, 0, 0);
      return next;
    }
  }

  // Wrap around: first target day next week
  const next = new Date(now);
  const daysUntil = (targetDays[0] - currentDay + 7) % 7 || 7;
  next.setDate(next.getDate() + daysUntil);
  next.setHours(hour, minute, 0, 0);
  return next;
}

/**
 * Advance nextSendAt by parsing the RRULE and computing the next occurrence.
 */
export function computeNextSendFromRrule(rrule: string): Date {
  const { days, hour, minute } = parseRrule(rrule);
  return computeNextSend(days, hour, minute);
}
