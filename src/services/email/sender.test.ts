import { beforeEach, describe, expect, it, vi } from 'vitest';

const sendMock = vi.fn();

vi.mock('resend', () => ({
  Resend: vi.fn(() => ({
    emails: {
      send: sendMock,
    },
  })),
}));

import { sendEmail } from './sender';

describe('services email sender', () => {
  beforeEach(() => {
    sendMock.mockReset();
  });

  it('accepts a successful Resend data response', async () => {
    sendMock.mockResolvedValue({
      data: { id: 'email_123' },
      error: null,
    });

    await expect(
      sendEmail({
        to: 'user@example.com',
        subject: 'Digest',
        html: '<p>Hello</p>',
        text: 'Hello',
      })
    ).resolves.toBeUndefined();
  });

  it('throws when Resend returns an error object', async () => {
    sendMock.mockResolvedValue({
      data: null,
      error: {
        message: 'Invalid from address',
        statusCode: 422,
        name: 'invalid_from_address',
      },
    });

    await expect(
      sendEmail({
        to: 'user@example.com',
        subject: 'Digest',
        html: '<p>Hello</p>',
        text: 'Hello',
      })
    ).rejects.toThrow(/Invalid from address/i);
  });

  it('rethrows transport exceptions', async () => {
    sendMock.mockRejectedValue(new Error('Network down'));

    await expect(
      sendEmail({
        to: 'user@example.com',
        subject: 'Digest',
        html: '<p>Hello</p>',
        text: 'Hello',
      })
    ).rejects.toThrow('Network down');
  });
});
