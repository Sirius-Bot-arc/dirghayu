/**
 * GET /api/visibility - Get visibility settings for all members
 * PUT /api/visibility - Update visibility for a member (elder only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession, requireSession } from '@/lib/auth';
import { getRepository } from '@/lib/repositories';
import { can } from '@/lib/authorization';
import { updateVisibilitySchema } from '@/lib/validation';
import { logActivity } from '@/lib/audit';
import { MemberId } from '@/types';

export async function GET() {
  try {
    const session = await requireSession();
    const repo = getRepository();

    const authz = can(session.role, 'read', 'visibility');
    if (!authz.allowed) {
      return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: authz.reason }}, { status: 403 });
    }

    const members = await repo.getMembersByHousehold(session.householdId);
    const visibility = members
      .filter(m => !m.deletedAt)
      .map(m => ({
        memberId: m.id,
        displayName: m.displayName,
        role: m.role,
        visibility: m.visibility
      }));

    return NextResponse.json({ success: true, data: { visibility } });
  } catch (error) {
    if (error instanceof Error && error.code === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' }}, { status: 401 });
    }
    console.error('Get visibility error:', error);
    return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get visibility' }}, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireSession();
    const repo = getRepository();

    // Only elder can manage visibility
    if (session.role !== 'elder') {
      return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Only the elder can manage visibility settings' }}, { status: 403 });
    }

    const body = await request.json();
    const validated = updateVisibilitySchema.parse(body);

    const member = await repo.getMember(validated.memberId as MemberId);
    if (!member || member.deletedAt || member.householdId !== session.householdId) {
      return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Member not found' }}, { status: 404 });
    }

    await repo.updateMember(validated.memberId as MemberId, { visibility: validated.visibility });

    await logActivity({
      householdId: session.householdId,
      memberId: session.memberId,
      action: 'visibility_updated',
      resourceType: 'visibility',
      resourceId: validated.memberId,
      metadata: { targetMember: member.displayName, visibility: validated.visibility }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: error.flatten().fieldErrors }}, { status: 400 });
    }
    if (error instanceof Error && error.code === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' }}, { status: 401 });
    }
    console.error('Update visibility error:', error);
    return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update visibility' }}, { status: 500 });
  }
}