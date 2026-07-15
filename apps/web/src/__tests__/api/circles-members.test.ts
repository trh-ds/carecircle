import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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
import { GET, POST } from '@/app/api/v1/circles/[circleId]/members/route';

const SESSION = { userId: 'user-1', email: 'alice@example.com', jti: 'jti-1', exp: 9999999999 };
const MEMBER_ROWS = [
  { id: 'user-1', full_name: 'Alice', email: 'alice@example.com', phone: '111', role: 'coordinator', joined_at: '2025-01-01' },
  { id: 'user-2', full_name: 'Bob', email: 'bob@example.com', phone: '222', role: 'caregiver', joined_at: '2025-01-02' },
];

function ctx(circleId: string) {
  return { params: Promise.resolve({ circleId }) };
}

beforeEach(() => {
  vi.mocked(exec).mockReset();
  vi.mocked(getSession).mockReset();
  vi.mocked(getMembership).mockReset();
  vi.mocked(getSession).mockResolvedValue(SESSION);
  vi.mocked(getMembership).mockResolvedValue({ role: 'coordinator', joined_at: '2025-01-01' });
  vi.mocked(exec).mockResolvedValue([MEMBER_ROWS]);
});

afterEach(() => {
  vi.clearAllMocks();
});

// ──── GET /api/v1/circles/{circleId}/members ────

describe('GET /api/v1/circles/{circleId}/members', () => {
  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const res = await GET(new Request('http://localhost'), ctx('circle-1'));
    expect(res.status).toBe(401);
  });

  it('returns 404 when user is not a member of the circle', async () => {
    vi.mocked(getMembership).mockResolvedValue(null);
    const res = await GET(new Request('http://localhost'), ctx('circle-1'));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe('RESOURCE_NOT_FOUND');
  });

  it('lists all members with their info', async () => {
    const res = await GET(new Request('http://localhost'), ctx('circle-1'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(2);
    expect(body.data[0].full_name).toBe('Alice');
    expect(body.data[1].role).toBe('caregiver');
  });

  it('returns empty array when no members', async () => {
    vi.mocked(exec).mockResolvedValue([[]]);
    const res = await GET(new Request('http://localhost'), ctx('circle-1'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual([]);
  });

  it('excludes soft-deleted users from results', async () => {
    await GET(new Request('http://localhost'), ctx('circle-1'));
    const sql = vi.mocked(exec).mock.calls[0][0] as string;
    expect(sql).toContain('u.deleted_at IS NULL');
  });

  it('orders members by joined_at ascending', async () => {
    await GET(new Request('http://localhost'), ctx('circle-1'));
    const sql = vi.mocked(exec).mock.calls[0][0] as string;
    expect(sql).toContain('ORDER BY cm.joined_at ASC');
  });
});

// ──── POST /api/v1/circles/{circleId}/members ────

describe('POST /api/v1/circles/{circleId}/members', () => {
  const validBody = { user_id: '123e4567-e89b-42d3-a456-426614174000', role: 'caregiver' };

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const req = new Request('http://localhost', { method: 'POST', body: JSON.stringify(validBody) });
    const res = await POST(req, ctx('circle-1'));
    expect(res.status).toBe(401);
  });

  it('returns 403 when not a coordinator', async () => {
    vi.mocked(getMembership).mockResolvedValue({ role: 'caregiver', joined_at: '2025-01-01' });
    const req = new Request('http://localhost', { method: 'POST', body: JSON.stringify(validBody) });
    const res = await POST(req, ctx('circle-1'));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 422 when user_id is missing', async () => {
    const req = new Request('http://localhost', { method: 'POST', body: JSON.stringify({ role: 'caregiver' }) });
    const res = await POST(req, ctx('circle-1'));
    expect(res.status).toBe(422);
  });

  it('returns 422 when user_id is not a valid UUID', async () => {
    const req = new Request('http://localhost', { method: 'POST', body: JSON.stringify({ user_id: 'not-a-uuid', role: 'caregiver' }) });
    const res = await POST(req, ctx('circle-1'));
    expect(res.status).toBe(422);
  });

  it('returns 422 when role is not a valid value', async () => {
    const req = new Request('http://localhost', { method: 'POST', body: JSON.stringify({ user_id: '123e4567-e89b-42d3-a456-426614174000', role: 'admin' }) });
    const res = await POST(req, ctx('circle-1'));
    expect(res.status).toBe(422);
  });

  it('returns 422 on invalid JSON', async () => {
    const req = new Request('http://localhost', { method: 'POST', body: 'bad' });
    const res = await POST(req, ctx('circle-1'));
    expect(res.status).toBe(422);
  });

  it('adds a member and returns 201', async () => {
    vi.mocked(exec).mockResolvedValue([]);
    const req = new Request('http://localhost', { method: 'POST', body: JSON.stringify(validBody) });
    const res = await POST(req, ctx('circle-1'));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.user_id).toBe(validBody.user_id);
    expect(body.data.role).toBe('caregiver');
    expect(body.data.circle_id).toBe('circle-1');
  });

  it('returns 409 on duplicate membership (MySQL errno 1062)', async () => {
    vi.mocked(exec).mockRejectedValue({ errno: 1062 });
    const req = new Request('http://localhost', { method: 'POST', body: JSON.stringify(validBody) });
    const res = await POST(req, ctx('circle-1'));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error.code).toBe('CONFLICT');
  });

  it('returns 500 on unexpected DB error', async () => {
    vi.mocked(exec).mockRejectedValue(new Error('DB down'));
    const req = new Request('http://localhost', { method: 'POST', body: JSON.stringify(validBody) });
    const res = await POST(req, ctx('circle-1'));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });
});

