/**
 * GET /api/ai/weekly-summary
 * Generate AI weekly adherence summary for family
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession, requireSession } from '@/lib/auth';
import { getRepository } from '@/lib/repositories';
import { can } from '@/lib/authorization';
import { generateWeeklySummary } from '@/lib/gemini';
import { calculateHouseholdAdherence, getDefaultAdherencePeriod } from '@/lib/adherence';
import { startOfWeek, endOfWeek, subWeeks } from 'date-fns';
import { logAIActivity } from '@/lib/audit';

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

    // Family and caretakers can view summary if adherence visible
    const authz = can(session.role, 'view_summary', 'summary', { visibility: member.visibility });
    if (!authz.allowed) {
      return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: authz.reason }}, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const weeksAgo = parseInt(searchParams.get('weeksAgo') ?? '0', 10);
    
    const now = new Date();
    const targetWeekStart = startOfWeek(subWeeks(now, weeksAgo));
    const targetWeekEnd = endOfWeek(targetWeekStart);

    const medications = await repo.getMedicationsByHousehold(session.householdId);
    const doses = await repo.getDosesByHousehold(session.householdId, targetWeekStart, targetWeekEnd);
    const appointments = await repo.getAppointmentsByHousehold(session.householdId);
    const weekAppointments = appointments.filter(a => 
      !a.deletedAt && a.scheduledAt >= targetWeekStart && a.scheduledAt <= targetWeekEnd
    );

    const adherenceResults = calculateHouseholdAdherence(
      medications.filter(m => !m.deletedAt),
      doses,
      { start: targetWeekStart, end: targetWeekEnd },
      household.timezone
    );

    const elder = await repo.getMembersByHousehold(session.householdId).then(m => m.find(m => m.role === 'elder'));
    const elderName = elder?.displayName ?? 'the elder';

    const adherenceData = adherenceResults.map(r => ({
      medicationId: r.medicationId,
      name: r.medicationName,
      scheduled: r.totalScheduled,
      taken: r.totalTaken,
      missed: r.totalMissed,
      adherence: r.pdc
    }));

    const summaryHtml = await generateWeeklySummary(
      session.householdId,
      elderName,
      adherenceData,
      weekAppointments.map(a => ({
        id: a.id,
        title: a.title,
        scheduledAt: a.scheduledAt,
        status: a.status
      })),
      null // Elder notes would come from a separate field
    );

    await logAIActivity(session.householdId, session.memberId, 'explain_medicine', 'weekly_summary', {
      weekStart: targetWeekStart.toISOString()
    });

    return NextResponse.json({
      success: true,
      data: {
        weekStart: targetWeekStart.toISOString(),
        weekEnd: targetWeekEnd.toISOString(),
        elderName,
        html: summaryHtml,
        adherence: adherenceResults,
        appointments: weekAppointments
      }
    });
  } catch (error) {
    if (error instanceof Error && error.code === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' }}, { status: 401 });
    }
    console.error('Weekly summary error:', error);
    return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to generate weekly summary' }}, { status: 500 });
  }
}