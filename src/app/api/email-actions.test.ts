import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  profileUpdate: vi.fn(),
  emailEventCreate: vi.fn(),
  validateAuthToken: vi.fn(),
  validateToken: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    profile: {
      update: mocks.profileUpdate,
    },
    emailEvent: {
      create: mocks.emailEventCreate,
    },
  },
}));

vi.mock('@/lib/auth', () => ({
  validateAuthToken: mocks.validateAuthToken,
}));

vi.mock('@/lib/tokens', () => ({
  validateToken: mocks.validateToken,
}));

import { GET as getPause } from '@/app/api/pause/route';
import { GET as getUnsubscribe } from '@/app/api/unsubscribe/route';

describe('email action routes', () => {
  beforeEach(() => {
    mocks.profileUpdate.mockReset();
    mocks.emailEventCreate.mockReset();
    mocks.validateAuthToken.mockReset();
    mocks.validateToken.mockReset();
  });

  it('pauses a subscription from a valid GET token link', async () => {
    mocks.validateAuthToken.mockResolvedValue('user-1');

    const response = await getPause(
      new NextRequest('http://localhost/api/pause?token=pause-token')
    );

    expect(response.status).toBe(200);
    expect(mocks.profileUpdate).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      data: { paused: true },
    });
    await expect(response.text()).resolves.toContain('Emails paused');
  });

  it('rejects an invalid pause GET token link', async () => {
    mocks.validateAuthToken.mockResolvedValue(null);

    const response = await getPause(
      new NextRequest('http://localhost/api/pause?token=bad-token')
    );

    expect(response.status).toBe(401);
    expect(mocks.profileUpdate).not.toHaveBeenCalled();
    await expect(response.text()).resolves.toContain('Pause link expired');
  });

  it('unsubscribes a user from a valid GET token link', async () => {
    mocks.validateToken.mockResolvedValue({
      valid: true,
      userId: 'user-1',
    });

    const response = await getUnsubscribe(
      new NextRequest('http://localhost/api/unsubscribe?token=unsubscribe-token')
    );

    expect(response.status).toBe(200);
    expect(mocks.profileUpdate).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      data: { emailEnabled: false },
    });
    expect(mocks.emailEventCreate).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        type: 'unsubscribed',
      },
    });
    await expect(response.text()).resolves.toContain('You are unsubscribed');
  });

  it('rejects an invalid unsubscribe GET token link', async () => {
    mocks.validateToken.mockResolvedValue({
      valid: false,
      userId: '',
      error: 'Invalid or expired token',
    });

    const response = await getUnsubscribe(
      new NextRequest('http://localhost/api/unsubscribe?token=bad-token')
    );

    expect(response.status).toBe(401);
    expect(mocks.profileUpdate).not.toHaveBeenCalled();
    expect(mocks.emailEventCreate).not.toHaveBeenCalled();
    await expect(response.text()).resolves.toContain('Unsubscribe link expired');
  });
});
