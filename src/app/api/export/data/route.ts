/**
 * GET /api/export/data
 * Export all household data as JSON
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession, requireSession } from '@/lib/auth';
import { getRepository } from '@/lib/repositories';
import { can } from '@/lib/authorization';
import { logActivity } from '@/lib/audit';
import { ExportData } from '@/types';

export async function GET() {
  try {
    const session = await requireSession();
    const repo = getRepository();

    const authz = can(session.role, 'export_data', 'export');
    if (!authz.allowed) {
      return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: authz.reason }}, { status: 403 });
    }

    const household = await repo.getHousehold(session.householdId);
    if (!household) {
      return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Household not found' }}, { status: 404 });
    }

    const members = await repo.getMembersByHousehold(session.householdId);
    const medications = await repo.getMedicationsByHousehold(session.householdId, true);
    const doses = await repo.getDosesByHousehold(session.householdId);
    const appointments = await repo.getAppointmentsByHousehold(session.householdId, true);
    const pendingChanges = await repo.getChangesByHousehold(session.householdId);
    const activityLog = (await repo.getActivityLog(session.householdId, 10000)).entries;
    const consents = await repo.getConsentsByHousehold(session.householdId);

    const exportData: ExportData = {
      household,
      members,
      medications,
      doses,
      appointments,
      pendingChanges,
      activityLog,
      consents,
      exportedAt: new Date()
    };

    await logActivity({
      householdId: session.householdId,
      memberId: session.memberId,
      action: 'data_exported',
      resourceType: 'export',
      resourceId: null,
      metadata: { format: 'json' }
    });

    return NextResponse.json({ success: true, data: exportData });
  } catch (error) {
    if (error instanceof Error && error.code === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' }}, { status: 401 });
    }
    console.error('Export data error:', error);
    return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to export data' }}, { status: 500 });
  }
}