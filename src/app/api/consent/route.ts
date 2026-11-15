
import { requireSession } from '@/lib/auth';
import { getAllConsents, updateConsent } from '@/lib/consent';
import { bulkConsentSchema } from '@/lib/validation';
import { ConsentType } from '@/types';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export async function GET() {
  try {
    const session = await requireSession();

    const consents = await getAllConsents(
      session.householdId,
      session.memberId
    );

    return NextResponse.json({
      success: true,
      data: { consents },
    });
  } catch (error) {
    if (error instanceof Error && error.code === 'UNAUTHORIZED') {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
        },
        { status: 401 }
      );
    }

    console.error('Get consent error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get consent settings' },
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = await request.json();
    const validated = bulkConsentSchema.parse(body);

    const updatedTypes = new Set<string>();

    for (const consent of validated.consents) {
      if (updatedTypes.has(consent.type)) {
        return NextResponse.json(
          {
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'Duplicate consent type' },
          },
          { status: 400 }
        );
      }

      updatedTypes.add(consent.type);

      await updateConsent(
        session.householdId,
        session.memberId,
        consent.type as ConsentType,
        consent.granted,
        session.memberId
      );
    }

    const consents = await getAllConsents(
      session.householdId,
      session.memberId
    );

    return NextResponse.json({
      success: true,
      data: { consents },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid consent settings',
            details: error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.code === 'UNAUTHORIZED') {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
        },
        { status: 401 }
      );
    }

    console.error('Update consent error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update consent settings' },
      },
      { status: 500 }
    );
  }
}
