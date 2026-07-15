// PATCH  /api/v1/circles/{circleId}/members/{userId} → change role (coordinator only)
// DELETE /api/v1/circles/{circleId}/members/{userId} → remove member (coordinator or self)

import db from '@/lib/db';
import { NextResponse } from 'next/server';
import { getSession } from '@/helpers/checkAuth';
import { getMembership, isCoordinator } from '@/helpers/circleauth';
import { UpdateMemberRoleSchema } from '@/validators/circle';
import { z } from 'zod';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ circleId: string; userId: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: { code: 'UNAUTHENTICATED', message: 'Sign in required' } },
      { status: 401 },
    );
  }

  const { circleId, userId } = await params;

  const membership = await getMembership(session.userId, circleId);
  if (!isCoordinator(membership)) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Only coordinators can change member roles' } },
      { status: 403 },
    );
  }

  let body: z.infer<typeof UpdateMemberRoleSchema>;
  try {
    body = UpdateMemberRoleSchema.parse(await req.json());
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

  try {
    const [result] = await db.execute(
      `UPDATE circle_members SET role = ? WHERE circle_id = ? AND user_id = ?`,
      [body.role, circleId, userId],
    );

    const affected = (result as { affectedRows: number }).affectedRows;
    if (affected === 0) {
      return NextResponse.json(
        { error: { code: 'RESOURCE_NOT_FOUND', message: 'Member not found in this circle' } },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { data: { circle_id: circleId, user_id: userId, role: body.role } },
      { status: 200 },
    );
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to update member role' } },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ circleId: string; userId: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: { code: 'UNAUTHENTICATED', message: 'Sign in required' } },
      { status: 401 },
    );
  }

  const { circleId, userId } = await params;

  const membership = await getMembership(session.userId, circleId);
  if (!membership) {
    return NextResponse.json(
      { error: { code: 'RESOURCE_NOT_FOUND', message: 'Circle not found' } },
      { status: 404 },
    );
  }

  // Allow: coordinator removing anyone, or a user removing themselves
  if (!isCoordinator(membership) && session.userId !== userId) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Only coordinators can remove other members' } },
      { status: 403 },
    );
  }

  try {
    const [result] = await db.execute(
      `DELETE FROM circle_members WHERE circle_id = ? AND user_id = ?`,
      [circleId, userId],
    );

    const affected = (result as { affectedRows: number }).affectedRows;
    if (affected === 0) {
      return NextResponse.json(
        { error: { code: 'RESOURCE_NOT_FOUND', message: 'Member not found in this circle' } },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { data: { circle_id: circleId, user_id: userId, removed: true } },
      { status: 200 },
    );
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to remove member' } },
      { status: 500 },
    );
  }
}
