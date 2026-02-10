import { createHash } from 'crypto';

interface DeepDiveLogEvent {
  jobId: string;
  userId: string;
  topic?: string;
  stage?: string;
  status?: string;
  elapsed?: number;
  sourcesOk?: number;
  sourcesTotal?: number;
  strategy?: string;
  partial?: boolean;
  error?: string;
}

function hashUserId(userId: string): string {
  return createHash('sha256').update(userId).digest('hex').slice(0, 8);
}

export function logDeepDive(event: DeepDiveLogEvent): void {
  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      svc: 'deep-dive',
      ...event,
      userId: hashUserId(event.userId),
    })
  );
}

export function logDailyTick(phase: string, data: object): void {
  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      svc: 'daily-tick',
      phase,
      ...data,
    })
  );
}
