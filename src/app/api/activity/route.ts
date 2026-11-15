/**
 * GET /api/activity
 * Get paginated activity log
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession, requireSession } from '@/lib/auth';
import { getRepository } from '@/lib/repositories';
import { can } from '@/lib/authorization';
import { paginationSchema } from '@/lib/validation';

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    const repo = getRepository();

    const { searchParams } = new URL(request.url);
    const { limit, cursor } = paginationSchema.parse(Object.fromEntries(searchParams));

    const authz = can(session.role, 'read', 'activity');
    if (!authz.allowed) {
      return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: authz.reason }}, { status: 403 });
    }

    const { entries, nextCursor } = await repo.getActivityLog(session.householdId, limit, cursor ?? undefined);

    // Filter by visibility for non-elder
    let visibleEntries = entries;
    if (session.role !== 'elder') {
      const member = await repo.getMember(session.memberId);
      if (member && !member.visibility.adherence) {
        visibleEntries = entries.filter(e => 
          e.resourceType !== 'dose' && e.resourceType !== 'medication'
        );
      }
    }

    return NextResponse.json({
      success: true,
      data: { items: visibleEntries, nextCursor, hasMore: !!nextCursor }
    });
  } catch (error) {
    if (error instanceof Error && error.code === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' }}, { status: 401 });
    }
    console.error('Activity log error:', error);
    return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get activity log' }}, { status: 500 });
  }
}