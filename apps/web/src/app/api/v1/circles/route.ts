// GET  /api/v1/circles        → list circles the user belongs to
// POST /api/v1/circles        → create a circle (creator auto-joins as coordinator)

import db from '@/lib/db';
import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { getSession } from '@/helpers/checkAuth';
import { CreateCircleSchema } from '@/validators/circle';
import { z } from 'zod';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: { code: 'UNAUTHENTICATED', message: 'Sign in required' } },
      { status: 401 },
    );
  }

  const [rows] = await db.execute(
    `SELECT c.id, c.name, c.tenant_timezone, c.created_at, cm.role
     FROM circles c
     JOIN circle_members cm ON cm.circle_id = c.id
     WHERE cm.user_id = ? AND c.deleted_at IS NULL
     ORDER BY c.created_at DESC`,
    [session.userId],
  );

  const circles = Array.isArray(rows) ? rows : [];

  return NextResponse.json({ data: circles }, { status: 200 });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: { code: 'UNAUTHENTICATED', message: 'Sign in required' } },
      { status: 401 },
    );
  }

  let body: z.infer<typeof CreateCircleSchema>;
  try {
    body = CreateCircleSchema.parse(await req.json());
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

  const circleId = crypto.randomUUID();
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

  try {
    await db.execute(
      `INSERT INTO circles (id, name, tenant_timezone, created_by, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [circleId, body.name, body.tenant_timezone, session.userId, now],
    );

    await db.execute(
      `INSERT INTO circle_members (circle_id, user_id, role, joined_at)
       VALUES (?, ?, 'coordinator', ?)`,
      [circleId, session.userId, now],
    );

    return NextResponse.json(
      { data: { id: circleId, name: body.name, tenant_timezone: body.tenant_timezone, role: 'coordinator', created_at: now } },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to create circle' } },
      { status: 500 },
    );
  }
}
