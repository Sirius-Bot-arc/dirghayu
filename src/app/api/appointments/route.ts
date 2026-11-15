/**
 * GET /api/appointments - List appointments
 * POST /api/appointments - Create appointment
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession, requireSession } from '@/lib/auth';
import { getRepository } from '@/lib/repositories';
import { can } from '@/lib/authorization';
import { createAppointmentSchema, paginationSchema } from '@/lib/validation';
import { logActivity, logAppointmentActivity } from '@/lib/audit';
import { Appointment, MemberId, HouseholdId, AppointmentId } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    const repo = getRepository();

    const { searchParams } = new URL(request.url);
    const { limit, cursor } = paginationSchema.parse(Object.fromEntries(searchParams));

    const authz = can(session.role, 'read', 'appointment');
    if (!authz.allowed) {
      return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: authz.reason }}, { status: 403 });
    }

    const appointments = await repo.getAppointmentsByHousehold(session.householdId);
    
    // Filter by visibility for non-elder
    let visibleAppointments = appointments;
    if (session.role !== 'elder') {
      const member = await repo.getMember(session.memberId);
      if (member && !member.visibility.appointments) {
        visibleAppointments = [];
      }
    }

    const startIndex = cursor ? visibleAppointments.findIndex(a => a.id === cursor) + 1 : 0;
    const items = visibleAppointments.slice(startIndex, startIndex + limit);
    const nextCursor = items.length === limit && startIndex + limit < visibleAppointments.length
      ? items[items.length - 1].id
      : null;

    return NextResponse.json({
      success: true,
      data: { items, nextCursor, hasMore: !!nextCursor }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid query', details: error.flatten().fieldErrors }}, { status: 400 });
    }
    if (error instanceof Error && error.code === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' }}, { status: 401 });
    }
    console.error('List appointments error:', error);
    return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to list appointments' }}, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const repo = getRepository();

    const body = await request.json();
    const validated = createAppointmentSchema.parse(body);

    const authz = can(session.role, 'create', 'appointment');
    if (!authz.allowed) {
      return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: authz.reason }}, { status: 403 });
    }

    if (session.role === 'elder') {
      const appointment = await repo.createAppointment({
        ...validated,
        description: validated.description ?? null,
        provider: validated.provider ?? null,
        location: validated.location ?? null,
        durationMinutes: validated.durationMinutes ?? null,
        householdId: session.householdId,
        scheduledAt: new Date(validated.scheduledAt),
        status: 'scheduled',
        reminderSent: false,
        createdBy: session.memberId,
      });

      await logAppointmentActivity(session.householdId, session.memberId, 'created', appointment.id, {
        title: appointment.title
      });

      return NextResponse.json({ success: true, data: appointment }, { status: 201 });
    } else {
      const change = await repo.createChange({
        householdId: session.householdId,
        type: 'appointment_create',
        resourceId: '' as AppointmentId,
        proposedData: validated,
        currentData: null,
        requestedBy: session.memberId,
        status: 'pending',
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
        metadata: { changeType: 'appointment_create', title: validated.title }
      });

      return NextResponse.json({ success: true, data: change }, { status: 201 });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: error.flatten().fieldErrors }}, { status: 400 });
    }
    if (error instanceof Error && error.code === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' }}, { status: 401 });
    }
    console.error('Create appointment error:', error);
    return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create appointment' }}, { status: 500 });
  }
}