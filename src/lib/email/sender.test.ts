import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  send: vi.fn(),
  emailEventCreate: vi.fn(),
}));

vi.mock('resend', () => ({
  Resend: vi.fn(() => ({
    emails: {
      send: mocks.send,
    },
  })),
}));

vi.mock('../db', () => ({
  prisma: {
    emailEvent: {
      create: mocks.emailEventCreate,
    },
  },
}));

import { sendDigestEmail } from './sender';

describe('legacy digest sender', () => {
  beforeEach(() => {
    mocks.send.mockReset();
    mocks.emailEventCreate.mockReset();
  });

  it('records sent only after a successful Resend response', async () => {
    mocks.send.mockResolvedValue({
      data: { id: 'email_123' },
      error: null,
    });

    await expect(
      sendDigestEmail({
        userId: 'user-1',
        digestId: 'digest-1',
        to: 'user@example.com',
        subject: 'Digest',
        html: '<p>Hello</p>',
        text: 'Hello',
      })
    ).resolves.toBe(true);

    expect(mocks.emailEventCreate).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        digestId: 'digest-1',
        type: 'sent',
      },
    });
  });

  it('records bounced and never sent when Resend returns an error object', async () => {
    mocks.send.mockResolvedValue({
      data: null,
      error: {
        message: 'Recipient rejected',
        statusCode: 400,
        name: 'validation_error',
      },
    });

    await expect(
      sendDigestEmail({
        userId: 'user-1',
        digestId: 'digest-1',
        to: 'user@example.com',
        subject: 'Digest',
        html: '<p>Hello</p>',
        text: 'Hello',
      })
    ).resolves.toBe(false);

    expect(mocks.emailEventCreate).toHaveBeenCalledTimes(1);
    expect(mocks.emailEventCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        digestId: 'digest-1',
        type: 'bounced',
      }),
    });
    expect(
      mocks.emailEventCreate.mock.calls.some(
        ([arg]) => arg.data.type === 'sent'
      )
    ).toBe(false);
  });

  it('records bounced when Resend throws before acceptance', async () => {
    mocks.send.mockRejectedValue(new Error('Network down'));

    await expect(
      sendDigestEmail({
        userId: 'user-1',
        digestId: 'digest-1',
        to: 'user@example.com',
        subject: 'Digest',
        html: '<p>Hello</p>',
        text: 'Hello',
      })
    ).resolves.toBe(false);

    expect(mocks.emailEventCreate).toHaveBeenCalledTimes(1);
    expect(mocks.emailEventCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: 'bounced',
        payload: { error: 'Network down' },
      }),
    });
    expect(
      mocks.emailEventCreate.mock.calls.some(
        ([arg]) => arg.data.type === 'sent'
      )
    ).toBe(false);
  });
});
