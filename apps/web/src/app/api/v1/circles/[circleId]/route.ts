// GET    /api/v1/circles/{circleId} → circle details
// PATCH  /api/v1/circles/{circleId} → update name/zone (coordinator only)
// DELETE /api/v1/circles/{circleId} → soft-delete (coordinator only)

import db from '@/lib/db';
import { NextResponse } from 'next/server';
import { getSession } from '@/helpers/checkAuth';
import { getMembership, isCoordinator } from '@/helpers/circleauth';
import { UpdateCircleSchema } from '@/validators/circle';
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
    `SELECT id, name, tenant_timezone, created_by, created_at, updated_at, deleted_at
     FROM circles WHERE id = ?`,
    [circleId],
  );

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json(
      { error: { code: 'RESOURCE_NOT_FOUND', message: 'Circle not found' } },
      { status: 404 },
    );
  }

  return NextResponse.json({ data: { ...(rows[0] as object), my_role: membership.role } }, { status: 200 });
}

export async function PATCH(
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
      { error: { code: 'UNAUTHORIZED', message: 'Only coordinators can update the circle' } },
      { status: 403 },
    );
  }

  let body: z.infer<typeof UpdateCircleSchema>;
  try {
    body = UpdateCircleSchema.parse(await req.json());
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

  const updates: string[] = [];
  const values: string[] = [];

  if (body.name !== undefined) {
    updates.push('name = ?');
    values.push(body.name);
  }
  if (body.tenant_timezone !== undefined) {
    updates.push('tenant_timezone = ?');
    values.push(body.tenant_timezone);
  }

  updates.push('updated_at = NOW()');
  values.push(circleId);

  try {
    await db.execute(
      `UPDATE circles SET ${updates.join(', ')} WHERE id = ?`,
      values,
    );
    return NextResponse.json({ data: { id: circleId, ...body } }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to update circle' } },
      { status: 500 },
    );
  }
}

export async function DELETE(
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
  if (!isCoordinator(membership)) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Only coordinators can delete the circle' } },
      { status: 403 },
    );
  }

  try {
    await db.execute(
      `UPDATE circles SET deleted_at = NOW(), updated_at = NOW() WHERE id = ? AND deleted_at IS NULL`,
      [circleId],
    );
    return NextResponse.json({ data: { id: circleId, deleted: true } }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to delete circle' } },
      { status: 500 },
    );
  }
}
