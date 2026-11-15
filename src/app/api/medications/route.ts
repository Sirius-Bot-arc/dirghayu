/**
 * GET /api/medications - List medications
 * POST /api/medications - Create medication (elder direct, caretaker pending)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession, requireSession } from '@/lib/auth';
import { getRepository } from '@/lib/repositories';
import { can, requiresElderApproval } from '@/lib/authorization';
import { createMedicationSchema, paginationSchema } from '@/lib/validation';
import { logActivity, logMedicationActivity } from '@/lib/audit';
import { logMedicationActivity as logMedAudit } from '@/lib/audit';
import { PendingChange, ChangeType, ChangeStatus, Medication, MemberId, HouseholdId, MedicationId } from '@/types';
import { nowInTimezone } from '@/lib/time';

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    const repo = getRepository();

    const { searchParams } = new URL(request.url);
    const { limit, cursor } = paginationSchema.parse(Object.fromEntries(searchParams));

    // Check authorization
    const authz = can(session.role, 'read', 'medication');
    if (!authz.allowed) {
      return NextResponse.json({
        success: false,
        error: { code: 'FORBIDDEN', message: authz.reason }
      }, { status: 403 });
    }

    const medications = await repo.getMedicationsByHousehold(session.householdId);
    
    // Filter by visibility for non-elder
    let visibleMeds = medications;
    if (session.role !== 'elder') {
      const member = await repo.getMember(session.memberId);
      if (member && !member.visibility.medications) {
        visibleMeds = [];
      }
    }

    // Simple pagination
    const startIndex = cursor ? visibleMeds.findIndex(m => m.id === cursor) + 1 : 0;
    const items = visibleMeds.slice(startIndex, startIndex + limit);
    const nextCursor = items.length === limit && startIndex + limit < visibleMeds.length
      ? items[items.length - 1].id
      : null;

    return NextResponse.json({
      success: true,
      data: {
        items,
        nextCursor,
        hasMore: !!nextCursor
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid query', details: error.flatten().fieldErrors }
      }, { status: 400 });
    }
    if (error instanceof Error && error.code === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' }}, { status: 401 });
    }
    console.error('List medications error:', error);
    return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to list medications' }}, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const repo = getRepository();

    const body = await request.json();
    const validated = createMedicationSchema.parse(body);

    // Check authorization
    const authz = can(session.role, 'create', 'medication');
    if (!authz.allowed) {
      return NextResponse.json({
        success: false,
        error: { code: 'FORBIDDEN', message: authz.reason }
      }, { status: 403 });
    }

    const household = await repo.getHousehold(session.householdId);
    if (!household) {
      return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Household not found' }}, { status: 404 });
    }

    // Elder creates directly, caretaker creates pending change
    if (session.role === 'elder') {
      const medication = await repo.createMedication({
        ...validated,
        genericName: validated.genericName ?? null,
        instructions: validated.instructions ?? null,
        customSchedule: validated.customSchedule ?? null,
        stockRemaining: validated.stockRemaining ?? null,
        notes: validated.notes ?? null,
        householdId: session.householdId,
        startDate: new Date(validated.startDate),
        endDate: validated.endDate ? new Date(validated.endDate) : null,
        createdBy: session.memberId,
      });

      // Generate initial dose records for the next 30 days
      const { generateDoseSchedule } = await import('@/lib/time');
      const doses = generateDoseSchedule(medication, new Date(), new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), household.timezone);
      for (const doseTime of doses) {
        await repo.createDose({
          householdId: session.householdId,
          medicationId: medication.id,
          scheduledAt: doseTime,
          takenAt: null,
          status: 'pending',
          takenBy: null,
          notedBy: null,
          note: null
        });
      }

      await logMedicationActivity(session.householdId, session.memberId, 'created', medication.id, {
        name: medication.name
      });

      return NextResponse.json({ success: true, data: medication }, { status: 201 });
    } else {
      // Caretaker proposes change
      const change = await repo.createChange({
        householdId: session.householdId,
        type: 'medication_create' as ChangeType,
        resourceId: '' as MedicationId, // Will be set after creation
        proposedData: validated,
        currentData: null,
        requestedBy: session.memberId,
        status: 'pending' as ChangeStatus,
        decidedBy: null,
        decidedAt: null,
        decisionNote: null,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      });

      await logActivity({
        householdId: session.householdId,
        memberId: session.memberId,
        action: 'change_proposed',
        resourceType: 'change',
        resourceId: change.id,
        metadata: { changeType: 'medication_create', medicationName: validated.name }
      });

      return NextResponse.json({ success: true, data: change }, { status: 201 });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: error.flatten().fieldErrors }
      }, { status: 400 });
    }
    if (error instanceof Error && error.code === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' }}, { status: 401 });
    }
    console.error('Create medication error:', error);
    return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create medication' }}, { status: 500 });
  }
}