/**
 * POST /api/ai/interactions
 * Check for potential interactions between medications
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession, requireSession } from '@/lib/auth';
import { getRepository } from '@/lib/repositories';
import { canUseAI } from '@/lib/authorization';
import { checkInteractions } from '@/lib/gemini';
import { logAIActivity } from '@/lib/audit';
import { interactionCheckSchema } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const repo = getRepository();

    const member = await repo.getMember(session.memberId);
    if (!member) {
      return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Member not found' }}, { status: 404 });
    }

    const { hasAIConsent } = await import('@/lib/consent');
    const aiConsent = await hasAIConsent(session.householdId, session.memberId);
    if (!aiConsent) {
      return NextResponse.json({ success: false, error: { code: 'CONSENT_REQUIRED', message: 'AI processing consent not granted' }}, { status: 403 });
    }

    const authz = canUseAI(session.role, member, aiConsent);
    if (!authz.allowed) {
      return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: authz.reason }}, { status: 403 });
    }

    const body = await request.json();
    const validated = interactionCheckSchema.parse(body);

    const result = await checkInteractions(
      session.householdId,
      session.memberId,
      validated.medications.map((medication) => ({
        name: medication.name,
        genericName: medication.genericName ?? null,
        dosage: medication.dosage ?? null
      }))
    );

    await logAIActivity(session.householdId, session.memberId, 'check_interactions', 'interaction_check', {
      medicationCount: validated.medications.length
    });

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        disclaimer: 'This is an AI screening tool, not medical advice. Always check with your doctor or pharmacist before making any changes to medications.'
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: error.flatten().fieldErrors }}, { status: 400 });
    }
    if (error instanceof Error && error.code === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' }}, { status: 401 });
    }
    console.error('Interaction check error:', error);
    return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to check interactions' }}, { status: 500 });
  }
}