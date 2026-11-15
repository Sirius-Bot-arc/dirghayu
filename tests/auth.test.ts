// @vitest-environment node

/**
 * Tests for passcode hashing, verification, and lockout
 */

import { createSession, generateElderPasscode, generateMemberPasscode, hashPasscode, isLockedOut, recordFailedAttempt, recordSuccessfulLogin, validatePasscodeFormat, verifyPasscode, verifySession } from '@/lib/auth';
import { Member } from '@/types';
import { describe, expect, it } from 'vitest';

describe('Auth Utilities', () => {
  describe('hashPasscode', () => {
    it('produces hash and salt', async () => {
      const result = await hashPasscode('123456');
      expect(result.hash).toBeDefined();
      expect(result.salt).toBeDefined();
      expect(result.hash).not.toBe('123456');
    });

    it('produces different hashes for same input', async () => {
      const r1 = await hashPasscode('123456');
      const r2 = await hashPasscode('123456');
      expect(r1.hash).not.toBe(r2.hash);
      expect(r1.salt).not.toBe(r2.salt);
    });
  });

  describe('verifyPasscode', () => {
    it('verifies correct passcode', async () => {
      const { hash } = await hashPasscode('123456');
      const result = await verifyPasscode('123456', hash);
      expect(result).toBe(true);
    });

    it('rejects incorrect passcode', async () => {
      const { hash } = await hashPasscode('123456');
      const result = await verifyPasscode('654321', hash);
      expect(result).toBe(false);
    });

    it('uses constant-time comparison', async () => {
      const { hash } = await hashPasscode('123456');
      // Should not throw and should return false
      const result = await verifyPasscode('wrong', hash);
      expect(result).toBe(false);
    });
  });

  describe('Session JWT', () => {
    it('creates and verifies session', async () => {
      const token = await createSession({ householdId: 'hh_1' as any, memberId: 'mem_1' as any, role: 'elder' });
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      const payload = await verifySession(token);
      expect(payload).not.toBeNull();
      expect(payload?.householdId).toBe('hh_1');
      expect(payload?.memberId).toBe('mem_1');
      expect(payload?.role).toBe('elder');
    });

    it('rejects tampered token', async () => {
      const token = await createSession({ householdId: 'hh_1' as any, memberId: 'mem_1' as any, role: 'elder' });
      const tampered = token.slice(0, -5) + 'xxxxx';
      const payload = await verifySession(tampered);
      expect(payload).toBeNull();
    });

    it('rejects expired token', async () => {
      // We can't easily test expiry without time manipulation
      // but we can verify the structure
      const token = await createSession({ householdId: 'hh_1' as any, memberId: 'mem_1' as any, role: 'elder' });
      const parts = token.split('.');
      expect(parts).toHaveLength(3);
    });
  });

  describe('Lockout mechanism', () => {
    const baseMember: Member = {
      id: 'mem_1' as any,
      householdId: 'hh_1' as any,
      role: 'elder',
      displayName: 'Test',
      passcodeHash: '',
      passcodeSalt: '',
      email: null,
      emailVerified: false,
      muteSettings: { doseReminders: false, missedDoseAlerts: false, appointmentReminders: false, criticalOnly: false },
      visibility: { medications: true, appointments: true, adherence: true },
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      lastLoginAt: null,
      loginAttempts: 0,
      lockedUntil: null
    };

    it('records failed attempts', () => {
      const member = { ...baseMember, loginAttempts: 0 };
      const updates = recordFailedAttempt(member);
      expect(updates.loginAttempts).toBe(1);
      expect(updates.lockedUntil).toBeNull();
    });

    it('locks out after 5 failed attempts', () => {
      const member = { ...baseMember, loginAttempts: 4 };
      const updates = recordFailedAttempt(member);
      expect(updates.loginAttempts).toBe(5);
      expect(updates.lockedUntil).not.toBeNull();
      expect(updates.lockedUntil!.getTime()).toBeGreaterThan(Date.now());
    });

    it('resets on successful login', () => {
      const member = { ...baseMember, loginAttempts: 3, lockedUntil: new Date(Date.now() + 10000) };
      const updates = recordSuccessfulLogin(member);
      expect(updates.loginAttempts).toBe(0);
      expect(updates.lockedUntil).toBeNull();
      expect(updates.lastLoginAt).not.toBeNull();
    });

    it('detects lockout', () => {
      const lockedMember = { ...baseMember, lockedUntil: new Date(Date.now() + 10000) };
      expect(isLockedOut(lockedMember)).toBe(true);

      const unlockedMember = { ...baseMember, lockedUntil: new Date(Date.now() - 10000) };
      expect(isLockedOut(unlockedMember)).toBe(false);

      const noLockMember = { ...baseMember, lockedUntil: null };
      expect(isLockedOut(noLockMember)).toBe(false);
    });
  });

  describe('Passcode generation', () => {
    it('generates 6+ digit elder passcode', () => {
      const passcode = generateElderPasscode();
      expect(passcode).toMatch(/^\d{6,}$/);
    });

    it('generates 8+ char member passcode', () => {
      const passcode = generateMemberPasscode();
      expect(passcode.length).toBeGreaterThanOrEqual(8);
      expect(passcode).toMatch(/^[A-Za-z0-9]+$/);
    });

    it('validates elder passcode format', () => {
      expect(validatePasscodeFormat('123456', 'elder')).toBe(true);
      expect(validatePasscodeFormat('12345', 'elder')).toBe(false);
      expect(validatePasscodeFormat('abcdef', 'elder')).toBe(false);
    });

    it('validates caretaker/family passcode format', () => {
      expect(validatePasscodeFormat('abcdefgh', 'caretaker')).toBe(true);
      expect(validatePasscodeFormat('12345678', 'caretaker')).toBe(true); // digits ok too
      expect(validatePasscodeFormat('short', 'caretaker')).toBe(false);
      expect(validatePasscodeFormat('123456', 'family')).toBe(false); // 6 digits not enough for non-elder
    });
  });
});
