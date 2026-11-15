/**
 * POST /api/auth/logout
 * Clear session cookie
 */

import { NextResponse } from 'next/server';
import { clearSessionCookie, getSession } from '@/lib/auth';
import { logActivity } from '@/lib/audit';
import { getRepository } from '@/lib/repositories';

export async function POST() {
  try {
    const session = await getSession();
    const repo = getRepository();

    if (session) {
      await logActivity({
        householdId: session.householdId,
        memberId: session.memberId,
        action: 'logout',
        resourceType: 'member',
        resourceId: session.memberId,
        metadata: {}
      });
    }

    await clearSessionCookie();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    await clearSessionCookie();
    return NextResponse.json({ success: true });
  }
}