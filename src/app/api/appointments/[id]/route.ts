/**
 * PATCH /api/appointments/[id] - Update appointment
 * DELETE /api/appointments/[id] - Delete appointment
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession, requireSession } from '@/lib/auth';
import { getRepository } from '@/lib/repositories';
import { can } from '@/lib/authorization';
import { updateAppointmentSchema } from '@/lib/validation';
import { logActivity, logAppointmentActivity } from '@/lib/audit';
import { Appointment, AppointmentId } from '@/types';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const repo = getRepository();
    const { id } = await params;

    const body = await request.json();
    const validated = updateAppointmentSchema.parse({ ...body, id });

    const appointment = await repo.getAppointment(id as AppointmentId);
    if (!appointment || appointment.deletedAt) {
      return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Appointment not found' }}, { status: 404 });
    }

    const authz = can(session.role, 'update', 'appointment', { resource: appointment });
    if (!authz.allowed) {
      return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: authz.reason }}, { status: 403 });
    }

    const currentData = { ...appointment };

    if (session.role === 'elder') {
      const { id: _appointmentId, ...updates } = validated;
      const updated = await repo.updateAppointment(id as AppointmentId, {
        ...updates,
        scheduledAt: validated.scheduledAt ? new Date(validated.scheduledAt) : undefined
      });

      await logAppointmentActivity(session.householdId, session.memberId, 'updated', appointment.id, {
        title: appointment.title,
        changes: validated
      });

      return NextResponse.json({ success: true, data: updated });
    } else {
      const change = await repo.createChange({
        householdId: session.householdId,
        type: 'appointment_update',
        resourceId: appointment.id,
        proposedData: validated,
        currentData: currentData,
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
        metadata: { changeType: 'appointment_update', title: appointment.title }
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
    console.error('Update appointment error:', error);
    return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update appointment' }}, { status: 500 });
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

    const appointment = await repo.getAppointment(id as AppointmentId);
    if (!appointment || appointment.deletedAt) {
      return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Appointment not found' }}, { status: 404 });
    }

    const authz = can(session.role, 'delete', 'appointment', { resource: appointment });
    if (!authz.allowed) {
      return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: authz.reason }}, { status: 403 });
    }

    if (session.role === 'elder') {
      await repo.deleteAppointment(id as AppointmentId);
      await logAppointmentActivity(session.householdId, session.memberId, 'deleted', appointment.id, {
        title: appointment.title
      });
      return NextResponse.json({ success: true });
    } else {
      const change = await repo.createChange({
        householdId: session.householdId,
        type: 'appointment_delete',
        resourceId: appointment.id,
        proposedData: { deleted: true },
        currentData: { ...appointment },
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
        metadata: { changeType: 'appointment_delete', title: appointment.title }
      });

      return NextResponse.json({ success: true, data: change });
    }
  } catch (error) {
    if (error instanceof Error && error.code === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' }}, { status: 401 });
    }
    console.error('Delete appointment error:', error);
    return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete appointment' }}, { status: 500 });
  }
}