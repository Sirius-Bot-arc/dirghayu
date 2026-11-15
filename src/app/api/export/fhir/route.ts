/**
 * GET /api/export/fhir
 * Export medications as FHIR R4 MedicationStatement bundle
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession, requireSession } from '@/lib/auth';
import { getRepository } from '@/lib/repositories';
import { can } from '@/lib/authorization';
import { logActivity } from '@/lib/audit';
import { FHIRMedicationStatement } from '@/types';

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

    const medications = await repo.getMedicationsByHousehold(session.householdId);
    const doses = await repo.getDosesByHousehold(session.householdId);
    const members = await repo.getMembersByHousehold(session.householdId);
    const elder = members.find(m => m.role === 'elder');

    const statements: FHIRMedicationStatement[] = medications
      .filter(m => !m.deletedAt)
      .map(med => {
        const medDoses = doses.filter(d => d.medicationId === med.id);
        const lastTaken = medDoses.filter(d => d.status === 'taken').sort((a, b) => b.takenAt!.getTime() - a.takenAt!.getTime())[0];
        
        return {
          resourceType: 'MedicationStatement' as const,
          id: med.id,
          status: med.endDate && new Date(med.endDate) < new Date() ? 'completed' : 'active',
          medicationCodeableConcept: {
            coding: [{
              system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
              code: med.genericName ?? med.name,
              display: med.name
            }],
            text: `${med.name} ${med.dosage}${med.unit}`
          },
          subject: {
            reference: `Patient/${elder?.id ?? 'elder'}`
          },
          effectiveDateTime: lastTaken?.takenAt?.toISOString() ?? med.startDate.toISOString(),
          dateAsserted: new Date().toISOString(),
          informationSource: {
            reference: `Practitioner/${session.memberId}`
          },
          dosage: [{
            timing: {
              repeat: {
                frequency: med.times.length,
                period: 1,
                periodUnit: 'd',
                timeOfDay: med.times
              }
            },
            doseAndRate: [{
              type: {
                coding: [{
                  system: 'http://terminology.hl7.org/CodeSystem/dose-rate-type',
                  code: 'ordered',
                  display: 'Ordered'
                }]
              },
              doseQuantity: {
                value: parseFloat(med.dosage),
                unit: med.unit,
                system: 'http://unitsofmeasure.org',
                code: med.unit
              }
            }]
          }]
        };
      });

    await logActivity({
      householdId: session.householdId,
      memberId: session.memberId,
      action: 'data_exported',
      resourceType: 'export',
      resourceId: null,
      metadata: { format: 'fhir', medicationCount: statements.length }
    });

    return NextResponse.json({
      success: true,
      data: {
        resourceType: 'Bundle',
        type: 'collection',
        entry: statements.map(s => ({ resource: s }))
      }
    });
  } catch (error) {
    if (error instanceof Error && error.code === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' }}, { status: 401 });
    }
    console.error('FHIR export error:', error);
    return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to export FHIR' }}, { status: 500 });
  }
}