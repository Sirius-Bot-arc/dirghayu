/**
 * GET /api/summary
 * Doctor Visit Summary - printable one-page summary
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession, requireSession } from '@/lib/auth';
import { getRepository } from '@/lib/repositories';
import { can } from '@/lib/authorization';
import { calculateHouseholdAdherence, getDefaultAdherencePeriod } from '@/lib/adherence';
import { DoctorVisitSummary } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    const repo = getRepository();

    const household = await repo.getHousehold(session.householdId);
    if (!household) {
      return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Household not found' }}, { status: 404 });
    }

    const member = await repo.getMember(session.memberId);
    if (!member) {
      return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Member not found' }}, { status: 404 });
    }

    const authz = can(session.role, 'view_summary', 'summary', { visibility: member.visibility });
    if (!authz.allowed) {
      return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: authz.reason }}, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') ?? '90', 10);
    
    const end = new Date();
    const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
    const period = { start, end };

    const medications = await repo.getMedicationsByHousehold(session.householdId);
    const doses = await repo.getDosesByHousehold(session.householdId, start, end);
    const appointments = await repo.getAppointmentsByHousehold(session.householdId);
    const pendingChanges = await repo.getChangesByHousehold(session.householdId, 'pending');

    const activeMeds = medications.filter(m => !m.deletedAt);
    const adherence = calculateHouseholdAdherence(activeMeds, doses, period, household.timezone);

    const missedDoses = doses
      .filter(d => d.status === 'missed')
      .map(d => {
        const med = medications.find(m => m.id === d.medicationId);
        return {
          medicationId: d.medicationId,
          medicationName: med?.name ?? 'Unknown',
          scheduledAt: d.scheduledAt,
          reason: d.note
        };
      });

    const elder = (await repo.getMembersByHousehold(session.householdId)).find(m => m.role === 'elder');

    const summary: DoctorVisitSummary = {
      householdId: session.householdId,
      elderName: elder?.displayName ?? 'the elder',
      period,
      generatedAt: new Date(),
      adherence,
      missedDoses,
      elderNotes: null, // Would come from a notes field
      pendingChanges: pendingChanges.filter(c => c.status === 'pending'),
      medications: activeMeds,
      appointments: appointments.filter(a => !a.deletedAt && a.scheduledAt >= start)
    };

    return NextResponse.json({ success: true, data: summary });
  } catch (error) {
    if (error instanceof Error && error.code === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' }}, { status: 401 });
    }
    console.error('Summary error:', error);
    return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to generate summary' }}, { status: 500 });
  }
}