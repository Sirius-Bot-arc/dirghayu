/**
 * POST /api/changes/[id]/decision
 * Elder approves or rejects a pending change
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession, requireSession } from '@/lib/auth';
import { getRepository } from '@/lib/repositories';
import { can } from '@/lib/authorization';
import { decideChangeSchema } from '@/lib/validation';
import { logActivity } from '@/lib/audit';
import { PendingChange, ChangeType, ChangeStatus, Medication, Appointment } from '@/types';
import { nowInTimezone } from '@/lib/time';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const repo = getRepository();
    const { id } = await params;

    // Only elder can decide
    if (session.role !== 'elder') {
      return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Only the elder can approve or reject changes' }}, { status: 403 });
    }

    const body = await request.json();
    const validated = decideChangeSchema.parse(body);

    const change = await repo.getChange(id as any);
    if (!change) {
      return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Change not found' }}, { status: 404 });
    }

    if (change.status !== 'pending') {
      return NextResponse.json({ success: false, error: { code: 'CONFLICT', message: 'Change already decided' }}, { status: 409 });
    }

    if (change.householdId !== session.householdId) {
      return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Not your household' }}, { status: 403 });
    }

    const now = nowInTimezone((await repo.getHousehold(session.householdId))?.timezone ?? 'Asia/Kolkata');
    
    if (now > change.expiresAt) {
      await repo.updateChange(change.id, { status: 'expired', decidedAt: now, updatedAt: now });
      return NextResponse.json({ success: false, error: { code: 'EXPIRED', message: 'Change has expired' }}, { status: 410 });
    }

    // Apply or reject
    if (validated.decision === 'approve') {
      await applyChange(repo, change, session);
      await repo.updateChange(change.id, { 
        status: 'approved', 
        decidedBy: session.memberId, 
        decidedAt: now, 
        decisionNote: validated.note,
        updatedAt: now
      });
      
      await logActivity({
        householdId: session.householdId,
        memberId: session.memberId,
        action: 'change_approved',
        resourceType: 'change',
        resourceId: change.id,
        metadata: { changeType: change.type, note: validated.note }
      });
    } else {
      await repo.updateChange(change.id, { 
        status: 'rejected', 
        decidedBy: session.memberId, 
        decidedAt: now, 
        decisionNote: validated.note,
        updatedAt: now
      });
      
      await logActivity({
        householdId: session.householdId,
        memberId: session.memberId,
        action: 'change_rejected',
        resourceType: 'change',
        resourceId: change.id,
        metadata: { changeType: change.type, note: validated.note }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: error.flatten().fieldErrors }}, { status: 400 });
    }
    if (error instanceof Error && error.code === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' }}, { status: 401 });
    }
    console.error('Decide change error:', error);
    return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to decide change' }}, { status: 500 });
  }
}

async function applyChange(repo: any, change: PendingChange, session: any): Promise<void> {
  const { generateDoseSchedule } = await import('@/lib/time');
  
  switch (change.type) {
    case 'medication_create': {
      const medData = change.proposedData as any;
      const medication = await repo.createMedication({
        ...medData,
        householdId: change.householdId,
        startDate: new Date(medData.startDate),
        endDate: medData.endDate ? new Date(medData.endDate) : null,
        createdBy: change.requestedBy,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null
      });
      
      // Generate doses
      const household = await repo.getHousehold(change.householdId);
      if (household) {
        const doses = generateDoseSchedule(medication, new Date(), new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), household.timezone);
        for (const doseTime of doses) {
          await repo.createDose({
            householdId: change.householdId,
            medicationId: medication.id,
            scheduledAt: doseTime,
            takenAt: null,
            status: 'pending',
            takenBy: null,
            notedBy: null,
            note: null
          });
        }
      }
      break;
    }
    case 'medication_update': {
      await repo.updateMedication(change.resourceId as any, {
        ...change.proposedData,
        startDate: change.proposedData.startDate ? new Date(change.proposedData.startDate as string) : undefined,
        endDate: change.proposedData.endDate ? new Date(change.proposedData.endDate as string) : change.proposedData.endDate === null ? null : undefined,
        updatedAt: new Date()
      });
      break;
    }
    case 'medication_delete': {
      await repo.deleteMedication(change.resourceId as any);
      break;
    }
    case 'appointment_create': {
      const aptData = change.proposedData as any;
      await repo.createAppointment({
        ...aptData,
        householdId: change.householdId,
        scheduledAt: new Date(aptData.scheduledAt),
        status: 'scheduled',
        reminderSent: false,
        createdBy: change.requestedBy,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null
      });
      break;
    }
    case 'appointment_update': {
      await repo.updateAppointment(change.resourceId as any, {
        ...change.proposedData,
        scheduledAt: change.proposedData.scheduledAt ? new Date(change.proposedData.scheduledAt as string) : undefined,
        updatedAt: new Date()
      });
      break;
    }
    case 'appointment_delete': {
      await repo.deleteAppointment(change.resourceId as any);
      break;
    }
  }
}