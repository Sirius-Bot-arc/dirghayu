/**
 * POST /api/ai/prescription-scan
 * Scan prescription photo -> structured medication list (elder confirms before saving)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession, requireSession } from '@/lib/auth';
import { getRepository } from '@/lib/repositories';
import { canUseAI } from '@/lib/authorization';
import { scanPrescription } from '@/lib/gemini';
import { logAIActivity } from '@/lib/audit';
import { prescriptionScanSchema } from '@/lib/validation';
import { ConsentType } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const repo = getRepository();

    const member = await repo.getMember(session.memberId);
    if (!member) {
      return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Member not found' }}, { status: 404 });
    }

    // Check authorization and consent
    const authz = canUseAI(session.role, member, false); // Will check consent inside
    if (!authz.allowed) {
      return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: authz.reason }}, { status: 403 });
    }

    // Verify AI consent specifically
    const { hasAIConsent } = await import('@/lib/consent');
    const aiConsent = await hasAIConsent(session.householdId, session.memberId);
    if (!aiConsent) {
      return NextResponse.json({ 
        success: false, 
        error: { code: 'CONSENT_REQUIRED', message: 'AI photo processing consent not granted' }
      }, { status: 403 });
    }

    const body = await request.json();
    const validated = prescriptionScanSchema.parse(body);

    // Process image
    const result = await scanPrescription(
      session.householdId,
      session.memberId,
      validated.imageBase64,
      validated.mimeType
    );

    // Log AI activity
    await logAIActivity(session.householdId, session.memberId, 'prescription_scan', 'prescription', {
      medicationCount: result.medications.length,
      confidence: result.confidence
    });

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        disclaimer: 'AI suggestion - Please review carefully and check with your doctor or pharmacist before saving.'
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: error.flatten().fieldErrors }}, { status: 400 });
    }
    if (error instanceof Error && error.code === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' }}, { status: 401 });
    }
    if (error instanceof Error && error.message.includes('consent')) {
      return NextResponse.json({ success: false, error: { code: 'CONSENT_REQUIRED', message: error.message }}, { status: 403 });
    }
    console.error('Prescription scan error:', error);
    return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to scan prescription' }}, { status: 500 });
  }
}