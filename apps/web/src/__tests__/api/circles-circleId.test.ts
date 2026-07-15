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
import { GET, PATCH, DELETE } from '@/app/api/v1/circles/[circleId]/route';

const SESSION = { userId: 'user-1', email: 'alice@example.com', jti: 'jti-1', exp: 9999999999 };
const CIRCLE_ROW = [{ id: 'circle-1', name: 'Family', tenant_timezone: 'UTC', created_by: 'user-1', created_at: '2025-01-01', updated_at: null, deleted_at: null }];

function ctx(circleId: string) {
  return { params: Promise.resolve({ circleId }) };
}

beforeEach(() => {
  vi.mocked(exec).mockReset();
  vi.mocked(getSession).mockReset();
  vi.mocked(getMembership).mockReset();
  vi.mocked(getSession).mockResolvedValue(SESSION);
  vi.mocked(getMembership).mockResolvedValue({ role: 'coordinator', joined_at: '2025-01-01' });
  vi.mocked(exec).mockResolvedValue([CIRCLE_ROW]);
});

afterEach(() => {
  vi.clearAllMocks();
});

// ──── GET /api/v1/circles/{circleId} ────

describe('GET /api/v1/circles/{circleId}', () => {
  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const res = await GET(new Request('http://localhost'), ctx('circle-1'));
    expect(res.status).toBe(401);
  });

  it('returns 404 when user is not a member', async () => {
    vi.mocked(getMembership).mockResolvedValue(null);
    const res = await GET(new Request('http://localhost'), ctx('circle-1'));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe('RESOURCE_NOT_FOUND');
  });

  it('returns 404 when circle row does not exist', async () => {
    vi.mocked(exec).mockResolvedValue([[]]);
    const res = await GET(new Request('http://localhost'), ctx('circle-1'));
    expect(res.status).toBe(404);
  });

  it('returns circle details with my_role', async () => {
    const res = await GET(new Request('http://localhost'), ctx('circle-1'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.name).toBe('Family');
    expect(body.data.my_role).toBe('coordinator');
  });

  it('includes deleted_at in response when set', async () => {
    vi.mocked(exec).mockResolvedValue([[{ ...CIRCLE_ROW[0], deleted_at: '2025-06-01' }]]);
    const res = await GET(new Request('http://localhost'), ctx('circle-1'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.deleted_at).toBe('2025-06-01');
  });
});

// ──── PATCH /api/v1/circles/{circleId} ────

describe('PATCH /api/v1/circles/{circleId}', () => {
  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const req = new Request('http://localhost', { method: 'PATCH', body: JSON.stringify({ name: 'X' }) });
    const res = await PATCH(req, ctx('circle-1'));
    expect(res.status).toBe(401);
  });

  it('returns 403 when not a coordinator', async () => {
    vi.mocked(getMembership).mockResolvedValue({ role: 'caregiver', joined_at: '2025-01-01' });
    const req = new Request('http://localhost', { method: 'PATCH', body: JSON.stringify({ name: 'X' }) });
    const res = await PATCH(req, ctx('circle-1'));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 422 on empty body', async () => {
    const req = new Request('http://localhost', { method: 'PATCH', body: JSON.stringify({}) });
    const res = await PATCH(req, ctx('circle-1'));
    expect(res.status).toBe(422);
  });

  it('returns 422 when name is too short', async () => {
    const req = new Request('http://localhost', { method: 'PATCH', body: JSON.stringify({ name: 'X' }) });
    const res = await PATCH(req, ctx('circle-1'));
    expect(res.status).toBe(422);
  });

  it('returns 422 on invalid JSON', async () => {
    const req = new Request('http://localhost', { method: 'PATCH', body: 'bad' });
    const res = await PATCH(req, ctx('circle-1'));
    expect(res.status).toBe(422);
  });

  it('updates circle name', async () => {
    vi.mocked(exec).mockResolvedValue([{ affectedRows: 1 }]);
    const req = new Request('http://localhost', { method: 'PATCH', body: JSON.stringify({ name: 'Updated' }) });
    const res = await PATCH(req, ctx('circle-1'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.name).toBe('Updated');
  });

  it('updates tenant_timezone only', async () => {
    vi.mocked(exec).mockResolvedValue([{ affectedRows: 1 }]);
    const req = new Request('http://localhost', { method: 'PATCH', body: JSON.stringify({ tenant_timezone: 'America/New_York' }) });
    const res = await PATCH(req, ctx('circle-1'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.tenant_timezone).toBe('America/New_York');
  });

  it('returns 500 on DB error', async () => {
    vi.mocked(exec).mockRejectedValue(new Error('DB down'));
    const req = new Request('http://localhost', { method: 'PATCH', body: JSON.stringify({ name: 'Updated' }) });
    const res = await PATCH(req, ctx('circle-1'));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });
});

// ──── DELETE /api/v1/circles/{circleId} ────

describe('DELETE /api/v1/circles/{circleId}', () => {
  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const req = new Request('http://localhost', { method: 'DELETE' });
    const res = await DELETE(req, ctx('circle-1'));
    expect(res.status).toBe(401);
  });

  it('returns 403 when not a coordinator', async () => {
    vi.mocked(getMembership).mockResolvedValue({ role: 'caregiver', joined_at: '2025-01-01' });
    const req = new Request('http://localhost', { method: 'DELETE' });
    const res = await DELETE(req, ctx('circle-1'));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('soft-deletes the circle (sets deleted_at)', async () => {
    vi.mocked(exec).mockResolvedValue([{ affectedRows: 1 }]);
    const req = new Request('http://localhost', { method: 'DELETE' });
    const res = await DELETE(req, ctx('circle-1'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.deleted).toBe(true);
  });

  it('only deletes circles that are not already deleted', async () => {
    vi.mocked(exec).mockResolvedValue([{ affectedRows: 1 }]);
    const req = new Request('http://localhost', { method: 'DELETE' });
    await DELETE(req, ctx('circle-1'));
    const sql = vi.mocked(exec).mock.calls[0][0] as string;
    expect(sql).toContain('deleted_at IS NULL');
  });

  it('returns 500 on DB error', async () => {
    vi.mocked(exec).mockRejectedValue(new Error('DB down'));
    const req = new Request('http://localhost', { method: 'DELETE' });
    const res = await DELETE(req, ctx('circle-1'));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });
});

