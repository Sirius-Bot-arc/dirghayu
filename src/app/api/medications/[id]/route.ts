/**
 * PATCH /api/medications/[id] - Update medication
 * DELETE /api/medications/[id] - Delete medication
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession, requireSession } from '@/lib/auth';
import { getRepository } from '@/lib/repositories';
import { can, requiresElderApproval } from '@/lib/authorization';
import { updateMedicationSchema } from '@/lib/validation';
import { logActivity, logMedicationActivity } from '@/lib/audit';
import { PendingChange, ChangeType, ChangeStatus, Medication, MemberId, HouseholdId, MedicationId } from '@/types';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const repo = getRepository();
    const { id } = await params;

    const body = await request.json();
    const validated = updateMedicationSchema.parse({ ...body, id });

    const medication = await repo.getMedication(id as MedicationId);
    if (!medication || medication.deletedAt) {
      return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Medication not found' }}, { status: 404 });
    }

    // Check authorization
    const authz = can(session.role, 'update', 'medication', { resource: medication });
    if (!authz.allowed) {
      return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: authz.reason }}, { status: 403 });
    }

    // Elder updates directly, caretaker proposes change
    const currentData = { ...medication };
    if (session.role === 'elder') {
      const { id: _medicationId, ...updates } = validated;
      const updated = await repo.updateMedication(id as MedicationId, {
        ...updates,
        startDate: validated.startDate ? new Date(validated.startDate) : undefined,
        endDate: validated.endDate ? new Date(validated.endDate) : validated.endDate === null ? null : undefined,
        updatedAt: new Date()
      });

      await logMedicationActivity(session.householdId, session.memberId, 'updated', medication.id, {
        name: medication.name,
        changes: validated
      });

      return NextResponse.json({ success: true, data: updated });
    } else {
      // Caretaker proposes change
      const change = await repo.createChange({
        householdId: session.householdId,
        type: 'medication_update' as ChangeType,
        resourceId: medication.id,
        proposedData: validated,
        currentData: currentData,
        requestedBy: session.memberId,
        status: 'pending' as ChangeStatus,
        decidedBy: null,
        decidedAt: null,
        decisionNote: null,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      await logActivity({
        householdId: session.householdId,
        memberId: session.memberId,
        action: 'change_proposed',
        resourceType: 'change',
        resourceId: change.id,
        metadata: { changeType: 'medication_update', medicationName: medication.name }
      });

      return NextResponse.json({ success: true, data: change });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: error.flatten().fieldErrors }}, { status: 400 });
    }
    if (error instanceof Error && error.code === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' }}, { status: 401 });
    }
    console.error('Update medication error:', error);
    return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update medication' }}, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const repo = getRepository();
    const { id } = await params;

    const medication = await repo.getMedication(id as MedicationId);
    if (!medication || medication.deletedAt) {
      return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Medication not found' }}, { status: 404 });
    }

    const authz = can(session.role, 'delete', 'medication', { resource: medication });
    if (!authz.allowed) {
      return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: authz.reason }}, { status: 403 });
    }

    if (session.role === 'elder') {
      await repo.deleteMedication(id as MedicationId);
      await logMedicationActivity(session.householdId, session.memberId, 'deleted', medication.id, {
        name: medication.name
      });
      return NextResponse.json({ success: true });
    } else {
      const change = await repo.createChange({
        householdId: session.householdId,
        type: 'medication_delete' as ChangeType,
        resourceId: medication.id,
        proposedData: { deleted: true },
        currentData: { ...medication },
        requestedBy: session.memberId,
        status: 'pending' as ChangeStatus,
        decidedBy: null,
        decidedAt: null,
        decisionNote: null,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      await logActivity({
        householdId: session.householdId,
        memberId: session.memberId,
        action: 'change_proposed',
        resourceType: 'change',
        resourceId: change.id,
        metadata: { changeType: 'medication_delete', medicationName: medication.name }
      });

      return NextResponse.json({ success: true, data: change });
    }
  } catch (error) {
    if (error instanceof Error && error.code === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' }}, { status: 401 });
    }
    console.error('Delete medication error:', error);
    return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete medication' }}, { status: 500 });
  }
}