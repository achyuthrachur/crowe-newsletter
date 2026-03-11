import type { ErrorResponse } from 'resend';

interface ResendResponse<T> {
  data: T | null;
  error: ErrorResponse | null;
}

export function getResendErrorMessage(error: ErrorResponse | null | undefined): string {
  if (!error) return 'Unknown Resend error';

  const status = error.statusCode ? ` (status ${error.statusCode})` : '';
  return `${error.message}${status}`;
}

export function assertResendSuccess<T>(
  response: ResendResponse<T>,
  action: string
): T {
  if (response.error) {
    throw new Error(`Resend failed to ${action}: ${getResendErrorMessage(response.error)}`);
  }

  if (!response.data) {
    throw new Error(`Resend failed to ${action}: empty response`);
  }

  return response.data;
}
