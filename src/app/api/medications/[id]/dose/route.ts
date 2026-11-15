/**
 * POST /api/medications/[id]/dose
 * Record a dose as taken or skipped
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession, requireSession } from '@/lib/auth';
import { getRepository } from '@/lib/repositories';
import { can } from '@/lib/authorization';
import { doseActionSchema } from '@/lib/validation';
import { logActivity, logMedicationActivity } from '@/lib/audit';
import { DoseRecord, DoseStatus, MedicationId, MemberId } from '@/types';
import { nowInTimezone } from '@/lib/time';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const repo = getRepository();
    const { id } = await params;

    const body = await request.json();
    const validated = doseActionSchema.parse(body);

    const medication = await repo.getMedication(id as MedicationId);
    if (!medication || medication.deletedAt) {
      return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Medication not found' }}, { status: 404 });
    }

    const authz = can(session.role, validated.status === 'taken' ? 'take_dose' : 'skip_dose', 'medication', { resource: medication });
    if (!authz.allowed) {
      return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: authz.reason }}, { status: 403 });
    }

    // Find the pending dose for this medication (closest to now)
    const doses = await repo.getDosesByMedication(id as MedicationId);
    const now = nowInTimezone((await repo.getHousehold(session.householdId))?.timezone ?? 'Asia/Kolkata');
    
    // Find closest pending dose within reasonable window
    let targetDose: DoseRecord | null = null;
    let minDiff = Infinity;
    
    for (const dose of doses) {
      if (dose.status === 'pending') {
        const diff = Math.abs(dose.scheduledAt.getTime() - now.getTime());
        if (diff < minDiff && diff < 4 * 60 * 60 * 1000) { // Within 4 hours
          minDiff = diff;
          targetDose = dose;
        }
      }
    }

    if (!targetDose) {
      // Create a new dose record for "as taken" scenario
      const newDose = await repo.createDose({
        householdId: session.householdId,
        medicationId: id as MedicationId,
        scheduledAt: now,
        takenAt: validated.status === 'taken' ? now : null,
        status: validated.status,
        takenBy: (validated.takenBy as MemberId | undefined) ?? session.memberId,
        notedBy: session.memberId,
        note: validated.note ?? null
      });

      await logMedicationActivity(session.householdId, session.memberId, validated.status === 'taken' ? 'dose_taken' : 'dose_skipped', id, {
        doseId: newDose.id,
        scheduledAt: newDose.scheduledAt.toISOString()
      });

      // Decrement stock if taken
      if (validated.status === 'taken' && medication.stockRemaining !== null && medication.stockRemaining > 0) {
        await repo.updateMedication(id as MedicationId, {
          stockRemaining: medication.stockRemaining - 1
        });
      }

      return NextResponse.json({ success: true, data: newDose });
    }

    // Update existing dose
    const updated = await repo.updateDose(targetDose.id, {
      status: validated.status,
      takenAt: validated.status === 'taken' ? now : null,
      takenBy: (validated.takenBy as MemberId | undefined) ?? session.memberId,
      notedBy: session.memberId,
      note: validated.note ?? null,
      updatedAt: new Date()
    });

    await logMedicationActivity(session.householdId, session.memberId, validated.status === 'taken' ? 'dose_taken' : 'dose_skipped', id, {
      doseId: targetDose.id,
      scheduledAt: targetDose.scheduledAt.toISOString()
    });

    // Decrement stock if taken
    if (validated.status === 'taken' && medication.stockRemaining !== null && medication.stockRemaining > 0) {
      await repo.updateMedication(id as MedicationId, {
        stockRemaining: medication.stockRemaining - 1
      });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: error.flatten().fieldErrors }}, { status: 400 });
    }
    if (error instanceof Error && error.code === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' }}, { status: 401 });
    }
    console.error('Record dose error:', error);
    return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to record dose' }}, { status: 500 });
  }
}