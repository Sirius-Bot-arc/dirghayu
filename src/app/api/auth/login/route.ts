/**
 * POST /api/auth/login
 * Passcode-based login with rate limiting and lockout
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getRepository } from '@/lib/repositories';
import { verifyPasscode, createSession, setSessionCookie, recordFailedAttempt, recordSuccessfulLogin, isLockedOut } from '@/lib/auth';
import { logActivity } from '@/lib/audit';
import { loginSchema } from '@/lib/validation';
import { Member, HouseholdId, MemberId } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = loginSchema.parse(body);

    const repo = getRepository();

    // Find member by household and passcode verification
    const members = await repo.getMembersByHousehold(validated.householdId as HouseholdId);
    
    let matchedMember: Member | null = null;
    for (const member of members) {
      if (member.deletedAt) continue;
      const isValid = await verifyPasscode(validated.passcode, member.passcodeHash);
      if (isValid) {
        matchedMember = member;
        break;
      }
    }

    if (!matchedMember) {
      // Generic error to prevent enumeration
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid household ID or passcode'
        }
      }, { status: 401 });
    }

    // Check lockout
    if (isLockedOut(matchedMember)) {
      const lockoutMinutes = Math.ceil((matchedMember.lockedUntil!.getTime() - Date.now()) / 60000);
      return NextResponse.json({
        success: false,
        error: {
          code: 'ACCOUNT_LOCKED',
          message: `Too many failed attempts. Try again in ${lockoutMinutes} minutes.`
        }
      }, { status: 429 });
    }

    // Verify passcode again (constant-time comparison handled by bcrypt)
    const isValid = await verifyPasscode(validated.passcode, matchedMember.passcodeHash);
    if (!isValid) {
      // Record failed attempt
      const updates = recordFailedAttempt(matchedMember);
      await repo.updateMember(matchedMember.id, updates);
      
      await logActivity({
        householdId: validated.householdId as HouseholdId,
        memberId: matchedMember.id,
        action: 'login',
        resourceType: 'member',
        resourceId: matchedMember.id,
        metadata: { success: false }
      });

      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid household ID or passcode'
        }
      }, { status: 401 });
    }

    // Successful login
    const updates = recordSuccessfulLogin(matchedMember);
    await repo.updateMember(matchedMember.id, updates);

    // Create session
    const session = await createSession({
      householdId: matchedMember.householdId,
      memberId: matchedMember.id,
      role: matchedMember.role
    });
    await setSessionCookie(session);

    await logActivity({
      householdId: matchedMember.householdId,
      memberId: matchedMember.id,
      action: 'login',
      resourceType: 'member',
      resourceId: matchedMember.id,
      metadata: { success: true }
    });

    return NextResponse.json({
      success: true,
      data: {
        member: {
          id: matchedMember.id,
          role: matchedMember.role,
          displayName: matchedMember.displayName,
          householdId: matchedMember.householdId
        }
      }
    });

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

    console.error('Login error:', error);
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Login failed'
      }
    }, { status: 500 });
  }
}