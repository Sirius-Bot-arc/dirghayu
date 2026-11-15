/**
 * GET /api/changes
 * List pending changes (elder sees all, caretaker sees own)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession, requireSession } from '@/lib/auth';
import { getRepository } from '@/lib/repositories';
import { can } from '@/lib/authorization';
import { paginationSchema } from '@/lib/validation';
import { ChangeStatus } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    const repo = getRepository();

    const { searchParams } = new URL(request.url);
    const { limit, cursor } = paginationSchema.parse(Object.fromEntries(searchParams));
    const status = searchParams.get('status') as ChangeStatus | null;

    const authz = can(session.role, 'read', 'change');
    if (!authz.allowed) {
      return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: authz.reason }}, { status: 403 });
    }

    const changes = await repo.getChangesByHousehold(session.householdId, status ?? undefined);

    // Filter: elder sees all, caretaker sees only their own
    let visibleChanges = changes;
    if (session.role === 'caretaker') {
      visibleChanges = changes.filter(c => c.requestedBy === session.memberId);
    } else if (session.role === 'family') {
      visibleChanges = [];
    }

    const startIndex = cursor ? visibleChanges.findIndex(c => c.id === cursor) + 1 : 0;
    const items = visibleChanges.slice(startIndex, startIndex + limit);
    const nextCursor = items.length === limit && startIndex + limit < visibleChanges.length
      ? items[items.length - 1].id
      : null;

    return NextResponse.json({
      success: true,
      data: { items, nextCursor, hasMore: !!nextCursor }
    });
  } catch (error) {
    if (error instanceof Error && error.code === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' }}, { status: 401 });
    }
    console.error('List changes error:', error);
    return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to list changes' }}, { status: 500 });
  }
}