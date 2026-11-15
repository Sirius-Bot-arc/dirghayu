import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession, requireSession } from '@/lib/auth';
import { getRepository } from '@/lib/repositories';
import { verifyPasscode } from '@/lib/auth';
import { logActivity } from '@/lib/audit';
import { clearSessionCookie } from '@/lib/auth';

const deleteHouseholdSchema = z.object({
  elderPasscode: z.string().min(6).max(20)
});

export async function DELETE(request: NextRequest) {
  try {
    const session = await requireSession();
    const repo = getRepository();

    // Only elder can delete household
    if (session.role !== 'elder') {
      return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Only the elder can delete the household' }}, { status: 403 });
    }

    const body = await request.json();
    const validated = deleteHouseholdSchema.parse(body);

    // Re-authenticate with elder passcode
    const elder = await repo.getMember(session.memberId);
    if (!elder) {
      return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Elder not found' }}, { status: 404 });
    }

    const isValid = await verifyPasscode(validated.elderPasscode, elder.passcodeHash);
    if (!isValid) {
      return NextResponse.json({ success: false, error: { code: 'INVALID_PASSCODE', message: 'Incorrect elder passcode' }}, { status: 401 });
    }

    // Hard delete everything
    const householdId = session.householdId;
    const household = await repo.getHousehold(householdId);
    
    await logActivity({
      householdId,
      memberId: session.memberId,
      action: 'household_deleted',
      resourceType: 'household',
      resourceId: householdId,
      metadata: { householdName: household?.name }
    });

    // Delete household (cascades in Firestore, manual in memory)
    await repo.deleteHousehold(householdId);

    // Clear session
    await clearSessionCookie();

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: error.flatten().fieldErrors }}, { status: 400 });
    }
    if (error instanceof Error && error.code === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' }}, { status: 401 });
    }
    console.error('Delete household error:', error);
    return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete household' }}, { status: 500 });
  }
}