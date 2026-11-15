/**
 * POST /api/households
 * Create a new household with elder as first member
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getRepository } from '@/lib/repositories';
import { hashPasscode, generateMemberPasscode, createSession, setSessionCookie } from '@/lib/auth';
import { initializeConsents } from '@/lib/consent';
import { logActivity } from '@/lib/audit';
import { createHouseholdSchema } from '@/lib/validation';
import { HouseholdId, MemberId, Role } from '@/types';
import { DEFAULT_TIMEZONE } from '@/lib/time';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = createHouseholdSchema.parse(body);

    const repo = getRepository();

    // Create household
    const household = await repo.createHousehold({
      name: validated.name,
      timezone: validated.timezone,
      createdBy: '' as MemberId, // Will update after member creation
    });

    // Hash elder passcode
    const { hash: passcodeHash, salt: passcodeSalt } = await hashPasscode(validated.elderPasscode);

    // Create elder member
    const elder = await repo.createMember({
      householdId: household.id,
      role: 'elder',
      displayName: validated.elderDisplayName,
      passcodeHash,
      passcodeSalt,
      email: validated.elderEmail ?? null,
      emailVerified: false,
      muteSettings: {
        doseReminders: false,
        missedDoseAlerts: false,
        appointmentReminders: false,
        criticalOnly: false
      },
      visibility: {
        medications: true,
        appointments: true,
        adherence: true
      }
    });

    // Update household with elder as creator
    await repo.updateHousehold(household.id, { createdBy: elder.id });

    // Initialize default consents for elder
    await initializeConsents(household.id, elder.id);

    // Log activity
    await logActivity({
      householdId: household.id,
      memberId: elder.id,
      action: 'household_created',
      resourceType: 'household',
      resourceId: household.id,
      metadata: { householdName: household.name }
    });

    // Create session
    const session = await createSession({
      householdId: household.id,
      memberId: elder.id,
      role: 'elder'
    });
    await setSessionCookie(session);

    return NextResponse.json({
      success: true,
      data: {
        household: {
          id: household.id,
          name: household.name,
          timezone: household.timezone
        },
        member: {
          id: elder.id,
          role: elder.role,
          displayName: elder.displayName
        }
      }
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input',
          details: error.flatten().fieldErrors
        }
      }, { status: 400 });
    }

    console.error('Create household error:', error);
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create household'
      }
    }, { status: 500 });
  }
}