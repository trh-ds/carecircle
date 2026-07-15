// GET  /api/v1/circles/{circleId}/members → list members
// POST /api/v1/circles/{circleId}/members → add member (coordinator only)

import db from '@/lib/db';
import { NextResponse } from 'next/server';
import { getSession } from '@/helpers/checkAuth';
import { getMembership, isCoordinator } from '@/helpers/circleauth';
import { AddMemberSchema } from '@/validators/circle';
import { z } from 'zod';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ circleId: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: { code: 'UNAUTHENTICATED', message: 'Sign in required' } },
      { status: 401 },
    );
  }

  const { circleId } = await params;

  const membership = await getMembership(session.userId, circleId);
  if (!membership) {
    return NextResponse.json(
      { error: { code: 'RESOURCE_NOT_FOUND', message: 'Circle not found' } },
      { status: 404 },
    );
  }

  const [rows] = await db.execute(
    `SELECT u.id, u.full_name, u.email, u.phone, cm.role, cm.joined_at
     FROM circle_members cm
     JOIN users u ON u.id = cm.user_id
     WHERE cm.circle_id = ? AND u.deleted_at IS NULL
     ORDER BY cm.joined_at ASC`,
    [circleId],
  );

  const members = Array.isArray(rows) ? rows : [];

  return NextResponse.json({ data: members }, { status: 200 });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ circleId: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: { code: 'UNAUTHENTICATED', message: 'Sign in required' } },
      { status: 401 },
    );
  }

  const { circleId } = await params;

  const membership = await getMembership(session.userId, circleId);
  if (!isCoordinator(membership)) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Only coordinators can add members' } },
      { status: 403 },
    );
  }

  let body: z.infer<typeof AddMemberSchema>;
  try {
    body = AddMemberSchema.parse(await req.json());
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: err.flatten() } },
        { status: 422 },
      );
    }
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Invalid JSON body' } },
      { status: 422 },
    );
  }

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

  try {
    await db.execute(
      `INSERT INTO circle_members (circle_id, user_id, role, joined_at)
       VALUES (?, ?, ?, ?)`,
      [circleId, body.user_id, body.role, now],
    );

    return NextResponse.json(
      { data: { circle_id: circleId, user_id: body.user_id, role: body.role, joined_at: now } },
      { status: 201 },
    );
  } catch (err: unknown) {
    const e = err as { errno?: number };
    if (e.errno === 1062) {
      return NextResponse.json(
        { error: { code: 'CONFLICT', message: 'User is already a member of this circle' } },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to add member' } },
      { status: 500 },
    );
  }
}
