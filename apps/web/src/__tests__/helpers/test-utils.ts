import { vi } from 'vitest';

export const mockDb = {
  execute: vi.fn(),
};

export function mockGetSession(overrides: Partial<{ userId: string; email: string }> = {}) {
  return {
    userId: overrides.userId ?? 'user-1',
    email: overrides.email ?? 'alice@example.com',
    jti: 'jti-1',
    exp: Math.floor(Date.now() / 1000) + 3600,
  };
}

export function mockGetSessionNull() {
  return null;
}

export function mockMembership(role: string = 'coordinator') {
  return { role, joined_at: '2025-01-01 00:00:00' };
}

export function mockMembershipNull() {
  return null;
}

export function setupMocks(sessionOverrides?: Partial<{ userId: string; email: string }>) {
  const session = mockGetSession(sessionOverrides);

  vi.mock('@/lib/db', () => ({ default: mockDb }));

  vi.mock('@/helpers/checkAuth', () => ({
    getSession: vi.fn().mockResolvedValue(session),
  }));

  vi.mock('@/helpers/circleauth', () => ({
    getMembership: vi.fn().mockResolvedValue(mockMembership()),
    isCoordinator: vi.fn((m: { role: string } | null) => m?.role === 'coordinator'),
    isMember: vi.fn((m: { role: string } | null) => m !== null),
  }));

  return { mockDb, session };
}

export function createRequest(method: string, body?: unknown): Request {
  return new Request('http://localhost:3000', {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
}
