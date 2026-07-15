import db from '@/lib/db';
import type { RowDataPacket } from 'mysql2';

export type CircleRole = 'coordinator' | 'recipient' | 'caregiver' | 'professional_viewer';

interface MembershipRow extends RowDataPacket {
  role: CircleRole;
  joined_at: string;
}

export interface Membership {
  role: CircleRole;
  joined_at: string;
}

export async function getMembership(
  userId: string,
  circleId: string,
): Promise<Membership | null> {
  const [rows] = await db.execute<MembershipRow[]>(
    `SELECT role, joined_at FROM circle_members
     WHERE user_id = ? AND circle_id = ?`,
    [userId, circleId],
  );
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return { role: rows[0].role, joined_at: rows[0].joined_at };
}

export function isCoordinator(membership: Membership | null): membership is Membership {
  return membership !== null && membership.role === 'coordinator';
}

export function isMember(membership: Membership | null): membership is Membership {
  return membership !== null;
}
