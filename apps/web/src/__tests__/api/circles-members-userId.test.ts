import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
vi.mock('@/lib/db', () => ({ default: { execute: vi.fn() as any } }));
vi.mock('@/helpers/checkAuth', () => ({ getSession: vi.fn() }));
vi.mock('@/helpers/circleauth', () => ({
  getMembership: vi.fn(),
  isCoordinator: (m: { role: string } | null) => m?.role === 'coordinator',
  isMember: (m: { role: string } | null) => m !== null,
}));

import db from '@/lib/db';
const exec = db.execute as ReturnType<typeof vi.fn>;
import { getSession } from '@/helpers/checkAuth';
import { getMembership } from '@/helpers/circleauth';
import { PATCH, DELETE } from '@/app/api/v1/circles/[circleId]/members/[userId]/route';

const SESSION = { userId: 'user-1', email: 'alice@example.com', jti: 'jti-1', exp: 9999999999 };

function ctx(circleId: string, userId: string) {
  return { params: Promise.resolve({ circleId, userId }) };
}

beforeEach(() => {
  vi.mocked(exec).mockReset();
  vi.mocked(getSession).mockReset();
  vi.mocked(getMembership).mockReset();
  vi.mocked(getSession).mockResolvedValue(SESSION);
  vi.mocked(getMembership).mockResolvedValue({ role: 'coordinator', joined_at: '2025-01-01' });
  vi.mocked(exec).mockResolvedValue([{ affectedRows: 1 }]);
});

afterEach(() => {
  vi.clearAllMocks();
});

// ──── PATCH /api/v1/circles/{circleId}/members/{userId} ────

describe('PATCH /api/v1/circles/{circleId}/members/{userId}', () => {
  const validRole = { role: 'caregiver' };

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const req = new Request('http://localhost', { method: 'PATCH', body: JSON.stringify(validRole) });
    const res = await PATCH(req, ctx('circle-1', 'user-2'));
    expect(res.status).toBe(401);
  });

  it('returns 403 when not a coordinator', async () => {
    vi.mocked(getMembership).mockResolvedValue({ role: 'caregiver', joined_at: '2025-01-01' });
    const req = new Request('http://localhost', { method: 'PATCH', body: JSON.stringify(validRole) });
    const res = await PATCH(req, ctx('circle-1', 'user-2'));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 422 when role is missing', async () => {
    const req = new Request('http://localhost', { method: 'PATCH', body: JSON.stringify({}) });
    const res = await PATCH(req, ctx('circle-1', 'user-2'));
    expect(res.status).toBe(422);
  });

  it('returns 422 when role is not in the enum', async () => {
    const req = new Request('http://localhost', { method: 'PATCH', body: JSON.stringify({ role: 'admin' }) });
    const res = await PATCH(req, ctx('circle-1', 'user-2'));
    expect(res.status).toBe(422);
  });

  it('returns 422 on invalid JSON', async () => {
    const req = new Request('http://localhost', { method: 'PATCH', body: 'bad' });
    const res = await PATCH(req, ctx('circle-1', 'user-2'));
    expect(res.status).toBe(422);
  });

  it('updates member role and returns 200', async () => {
    const req = new Request('http://localhost', { method: 'PATCH', body: JSON.stringify(validRole) });
    const res = await PATCH(req, ctx('circle-1', 'user-2'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.role).toBe('caregiver');
    expect(body.data.user_id).toBe('user-2');
    expect(body.data.circle_id).toBe('circle-1');
  });

  it('returns 404 when member does not exist', async () => {
    vi.mocked(exec).mockResolvedValue([{ affectedRows: 0 }]);
    const req = new Request('http://localhost', { method: 'PATCH', body: JSON.stringify(validRole) });
    const res = await PATCH(req, ctx('circle-1', 'user-999'));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe('RESOURCE_NOT_FOUND');
  });

  it('returns 500 on DB error', async () => {
    vi.mocked(exec).mockRejectedValue(new Error('DB down'));
    const req = new Request('http://localhost', { method: 'PATCH', body: JSON.stringify(validRole) });
    const res = await PATCH(req, ctx('circle-1', 'user-2'));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });
});

// ──── DELETE /api/v1/circles/{circleId}/members/{userId} ────

describe('DELETE /api/v1/circles/{circleId}/members/{userId}', () => {
  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const req = new Request('http://localhost', { method: 'DELETE' });
    const res = await DELETE(req, ctx('circle-1', 'user-2'));
    expect(res.status).toBe(401);
  });

  it('returns 404 when requesting user is not a member of the circle', async () => {
    vi.mocked(getMembership).mockResolvedValue(null);
    const req = new Request('http://localhost', { method: 'DELETE' });
    const res = await DELETE(req, ctx('circle-1', 'user-2'));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe('RESOURCE_NOT_FOUND');
  });

  it('returns 403 when non-coordinator tries to remove someone else', async () => {
    vi.mocked(getMembership).mockResolvedValue({ role: 'caregiver', joined_at: '2025-01-01' });
    const req = new Request('http://localhost', { method: 'DELETE' });
    const res = await DELETE(req, ctx('circle-1', 'user-2'));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('allows a member to remove themselves (self-removal)', async () => {
    vi.mocked(getMembership).mockResolvedValue({ role: 'caregiver', joined_at: '2025-01-01' });
    const req = new Request('http://localhost', { method: 'DELETE' });
    const res = await DELETE(req, ctx('circle-1', 'user-1'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.removed).toBe(true);
  });

  it('allows coordinator to remove any member', async () => {
    const req = new Request('http://localhost', { method: 'DELETE' });
    const res = await DELETE(req, ctx('circle-1', 'user-2'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.removed).toBe(true);
  });

  it('returns 404 when the member to remove is not found', async () => {
    vi.mocked(exec).mockResolvedValue([{ affectedRows: 0 }]);
    const req = new Request('http://localhost', { method: 'DELETE' });
    const res = await DELETE(req, ctx('circle-1', 'user-999'));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe('RESOURCE_NOT_FOUND');
  });

  it('returns 500 on DB error', async () => {
    vi.mocked(exec).mockRejectedValue(new Error('DB down'));
    const req = new Request('http://localhost', { method: 'DELETE' });
    const res = await DELETE(req, ctx('circle-1', 'user-2'));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });
});

