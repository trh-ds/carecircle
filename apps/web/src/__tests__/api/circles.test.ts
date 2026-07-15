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
import { getSession } from '@/helpers/checkAuth';
import { getMembership } from '@/helpers/circleauth';
import { GET, POST } from '@/app/api/v1/circles/route';

const exec = db.execute as ReturnType<typeof vi.fn>;

const SESSION = { userId: 'user-1', email: 'alice@example.com', jti: 'jti-1', exp: 9999999999 };

beforeEach(() => {
  vi.mocked(exec).mockReset();
  vi.mocked(getSession).mockReset();
  vi.mocked(getMembership).mockReset();
  vi.mocked(getSession).mockResolvedValue(SESSION);
  vi.mocked(getMembership).mockResolvedValue({ role: 'coordinator', joined_at: '2025-01-01' });
});

afterEach(() => {
  vi.clearAllMocks();
});

// ──── GET /api/v1/circles ────

describe('GET /api/v1/circles', () => {
  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('UNAUTHENTICATED');
  });

  it('returns the user\'s circles', async () => {
    vi.mocked(exec).mockResolvedValue([
      [
        { id: 'circle-1', name: 'Family', tenant_timezone: 'UTC', created_at: '2025-01-01', role: 'coordinator' },
        { id: 'circle-2', name: 'Work', tenant_timezone: 'Asia/Kolkata', created_at: '2025-02-01', role: 'caregiver' },
      ],
    ]);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(2);
    expect(body.data[0].name).toBe('Family');
    expect(body.data[1].role).toBe('caregiver');
  });

  it('returns empty array when user has no circles', async () => {
    vi.mocked(exec).mockResolvedValue([[]]);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual([]);
  });

  it('only returns circles where user is a member', async () => {
    vi.mocked(exec).mockResolvedValue([[
      { id: 'circle-1', name: 'Family', tenant_timezone: 'UTC', created_at: '2025-01-01', role: 'coordinator' },
    ]]);

    await GET();
    expect(exec).toHaveBeenCalledWith(
      expect.stringContaining('WHERE cm.user_id = ?'),
      expect.arrayContaining(['user-1']),
    );
  });
});

// ──── POST /api/v1/circles ────

describe('POST /api/v1/circles', () => {
  const validBody = { name: 'My Circle', tenant_timezone: 'Asia/Kolkata' };

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const req = new Request('http://localhost', { method: 'POST', body: JSON.stringify(validBody) });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 422 when body is missing fields', async () => {
    const req = new Request('http://localhost', { method: 'POST', body: JSON.stringify({}) });
    const res = await POST(req);
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 422 when name is too short', async () => {
    const req = new Request('http://localhost', { method: 'POST', body: JSON.stringify({ name: 'X', tenant_timezone: 'UTC' }) });
    const res = await POST(req);
    expect(res.status).toBe(422);
  });

  it('returns 422 on invalid JSON', async () => {
    const req = new Request('http://localhost', { method: 'POST', body: 'not json' });
    const res = await POST(req);
    expect(res.status).toBe(422);
  });

  it('creates circle and adds creator as coordinator', async () => {
    vi.mocked(exec).mockResolvedValue([]);

    const req = new Request('http://localhost', { method: 'POST', body: JSON.stringify(validBody) });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.name).toBe('My Circle');
    expect(body.data.tenant_timezone).toBe('Asia/Kolkata');
    expect(body.data.role).toBe('coordinator');
    expect(body.data.id).toBeDefined();
  });

  it('inserts into circles and circle_members tables', async () => {
    vi.mocked(exec).mockResolvedValue([]);

    const req = new Request('http://localhost', { method: 'POST', body: JSON.stringify(validBody) });
    await POST(req);

    const calls = vi.mocked(exec).mock.calls;
    expect(calls[0][0]).toContain('INSERT INTO circles');
    expect(calls[1][0]).toContain('INSERT INTO circle_members');
  });

  it('returns 500 on DB error', async () => {
    vi.mocked(exec).mockRejectedValue(new Error('DB down'));

    const req = new Request('http://localhost', { method: 'POST', body: JSON.stringify(validBody) });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });
});

