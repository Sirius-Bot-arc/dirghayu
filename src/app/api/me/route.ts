/**
 * GET /api/me
 * Get current authenticated member info
 */

import { NextResponse } from 'next/server';
import { getSession, requireSession } from '@/lib/auth';
import { getRepository } from '@/lib/repositories';

export async function GET() {
  try {
    const session = await requireSession();
    const repo = getRepository();

    const member = await repo.getMember(session.memberId);
    if (!member || member.deletedAt) {
      return NextResponse.json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Member not found' }
      }, { status: 404 });
    }

    const household = await repo.getHousehold(session.householdId);
    
    return NextResponse.json({
      success: true,
      data: {
        member: {
          id: member.id,
          role: member.role,
          displayName: member.displayName,
          email: member.email,
          visibility: member.visibility,
          muteSettings: member.muteSettings
        },
        household: household ? {
          id: household.id,
          name: household.name,
          timezone: household.timezone
        } : null
      }
    });
  } catch (error) {
    if (error instanceof Error && error.code === 'UNAUTHORIZED') {
      return NextResponse.json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Not authenticated' }
      }, { status: 401 });
    }
    console.error('Me error:', error);
    return NextResponse.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get member info' }
    }, { status: 500 });
  }
}