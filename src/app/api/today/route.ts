/**
 * GET /api/today
 * Get today's schedule for the household (medications + appointments)
 */

import { NextResponse } from 'next/server';
import { getSession, requireSession } from '@/lib/auth';
import { getRepository } from '@/lib/repositories';
import { can } from '@/lib/authorization';
import { startOfDayInTimezone, endOfDayInTimezone, formatLocalTime, nowInTimezone } from '@/lib/time';

export async function GET() {
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

    const now = nowInTimezone(household.timezone);
    const dayStart = startOfDayInTimezone(now, household.timezone);
    const dayEnd = endOfDayInTimezone(now, household.timezone);

    // Get medications
    const medications = await repo.getMedicationsByHousehold(session.householdId);
    const activeMeds = medications.filter(m => !m.deletedAt);

    // Get doses for today
    const doses = await repo.getDosesByHousehold(session.householdId, dayStart, dayEnd);

    // Build medication schedule
    const medicationSchedule = activeMeds.map(med => {
      const medDoses = doses.filter(d => d.medicationId === med.id);
      const upcoming = medDoses
        .filter(d => d.status === 'pending' && d.scheduledAt >= now)
        .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
      const taken = medDoses.filter(d => d.status === 'taken');
      const missed = medDoses.filter(d => d.status === 'missed');
      const skipped = medDoses.filter(d => d.status === 'skipped');

      return {
        medication: {
          id: med.id,
          name: med.name,
          dosage: med.dosage,
          unit: med.unit,
          instructions: med.instructions,
          times: med.times
        },
        doses: {
          upcoming: upcoming.map(d => ({
            id: d.id,
            scheduledAt: d.scheduledAt.toISOString(),
            time: formatLocalTime(d.scheduledAt, household.timezone),
            status: d.status
          })),
          taken: taken.map(d => ({
            id: d.id,
            scheduledAt: d.scheduledAt.toISOString(),
            time: formatLocalTime(d.scheduledAt, household.timezone),
            takenAt: d.takenAt?.toISOString()
          })),
          missed: missed.map(d => ({
            id: d.id,
            scheduledAt: d.scheduledAt.toISOString(),
            time: formatLocalTime(d.scheduledAt, household.timezone)
          })),
          skipped: skipped.map(d => ({
            id: d.id,
            scheduledAt: d.scheduledAt.toISOString(),
            time: formatLocalTime(d.scheduledAt, household.timezone)
          }))
        }
      };
    });

    // Get appointments for today
    const appointments = await repo.getAppointmentsByHousehold(session.householdId);
    const todayAppointments = appointments
      .filter(a => !a.deletedAt && a.scheduledAt >= dayStart && a.scheduledAt <= dayEnd)
      .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());

    // Filter by visibility
    let visibleAppointments = todayAppointments;
    if (session.role !== 'elder' && member && !member.visibility.appointments) {
      visibleAppointments = [];
    }

    return NextResponse.json({
      success: true,
      data: {
        date: now.toISOString().split('T')[0],
        timezone: household.timezone,
        medications: medicationSchedule,
        appointments: visibleAppointments.map(a => ({
          id: a.id,
          title: a.title,
          description: a.description,
          provider: a.provider,
          location: a.location,
          scheduledAt: a.scheduledAt.toISOString(),
          durationMinutes: a.durationMinutes,
          status: a.status
        }))
      }
    });
  } catch (error) {
    if (error instanceof Error && error.code === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' }}, { status: 401 });
    }
    console.error('Today error:', error);
    return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get today schedule' }}, { status: 500 });
  }
}