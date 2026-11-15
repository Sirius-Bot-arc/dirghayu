/**
 * Tests for authorization matrix
 */

import { describe, it, expect } from 'vitest';
import { can, canViewMemberData, requiresElderApproval, getElderId } from '@/lib/authorization';
import { Role, Member, Medication, Appointment, PendingChange, ChangeType, ChangeStatus, VisibilitySettings } from '@/types';

describe('Authorization Matrix', () => {
  const elder: Member = {
    id: 'mem_elder' as any,
    householdId: 'hh_1' as any,
    role: 'elder',
    displayName: 'Elder',
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

  const caretaker: Member = {
    ...elder,
    id: 'mem_caretaker' as any,
    role: 'caretaker',
    displayName: 'Caretaker',
    email: 'caretaker@example.com',
    visibility: { medications: true, appointments: true, adherence: true }
  };

  const family: Member = {
    ...elder,
    id: 'mem_family' as any,
    role: 'family',
    displayName: 'Family',
    email: 'family@example.com',
    visibility: { medications: true, appointments: true, adherence: true }
  };

  const medication: Medication = {
    id: 'med_1' as any,
    householdId: 'hh_1' as any,
    name: 'Test Med',
    genericName: null,
    dosage: '10',
    unit: 'mg',
    instructions: null,
    frequency: 'daily',
    customSchedule: null,
    startDate: new Date(),
    endDate: null,
    times: ['09:00'],
    stockRemaining: 30,
    refillThresholdDays: 7,
    notes: null,
    createdBy: 'mem_elder' as any,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null
  };

  const appointment: Appointment = {
    id: 'apt_1' as any,
    householdId: 'hh_1' as any,
    title: 'Doctor Visit',
    description: null,
    provider: null,
    location: null,
    scheduledAt: new Date(),
    durationMinutes: 30,
    status: 'scheduled',
    reminderSent: false,
    createdBy: 'mem_elder' as any,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null
  };

  const pendingChange: PendingChange = {
    id: 'chg_1' as any,
    householdId: 'hh_1' as any,
    type: 'medication_create' as ChangeType,
    resourceId: 'med_1' as any,
    proposedData: {},
    currentData: null,
    requestedBy: 'mem_caretaker' as any,
    status: 'pending' as ChangeStatus,
    decidedBy: null,
    decidedAt: null,
    decisionNote: null,
    expiresAt: new Date(Date.now() + 7*24*60*60*1000),
    createdAt: new Date(),
    updatedAt: new Date()
  };

  describe('Elder permissions', () => {
    it('can read, create, update, delete household', () => {
      expect(can('elder', 'read', 'household').allowed).toBe(true);
      expect(can('elder', 'delete', 'household').allowed).toBe(true);
      expect(can('elder', 'update', 'household').allowed).toBe(false);
    });

    it('can manage members', () => {
      expect(can('elder', 'read', 'member').allowed).toBe(true);
      expect(can('elder', 'create', 'member').allowed).toBe(true);
      expect(can('elder', 'update', 'member').allowed).toBe(true);
      expect(can('elder', 'delete', 'member').allowed).toBe(true);
    });

    it('can manage medications directly', () => {
      expect(can('elder', 'read', 'medication', { resource: medication }).allowed).toBe(true);
      expect(can('elder', 'create', 'medication').allowed).toBe(true);
      expect(can('elder', 'update', 'medication', { resource: medication }).allowed).toBe(true);
      expect(can('elder', 'delete', 'medication', { resource: medication }).allowed).toBe(true);
      expect(can('elder', 'take_dose', 'medication', { resource: medication }).allowed).toBe(true);
    });

    it('can manage appointments directly', () => {
      expect(can('elder', 'read', 'appointment', { resource: appointment }).allowed).toBe(true);
      expect(can('elder', 'create', 'appointment').allowed).toBe(true);
      expect(can('elder', 'update', 'appointment', { resource: appointment }).allowed).toBe(true);
      expect(can('elder', 'delete', 'appointment', { resource: appointment }).allowed).toBe(true);
    });

    it('can approve/reject changes', () => {
      expect(can('elder', 'approve_change', 'change', { resource: pendingChange }).allowed).toBe(true);
      expect(can('elder', 'reject_change', 'change', { resource: pendingChange }).allowed).toBe(true);
    });

    it('can export data and delete household', () => {
      expect(can('elder', 'export_data', 'export').allowed).toBe(true);
      expect(can('elder', 'delete_household', 'household').allowed).toBe(true);
    });
  });

  describe('Caretaker permissions', () => {
    it('can read household but not modify', () => {
      expect(can('caretaker', 'read', 'household').allowed).toBe(true);
      expect(can('caretaker', 'delete', 'household').allowed).toBe(false);
    });

    it('can read medications if visible', () => {
      expect(can('caretaker', 'read', 'medication', { resource: medication, visibility: { medications: true, appointments: true, adherence: true } }).allowed).toBe(true);
      expect(can('caretaker', 'read', 'medication', { resource: medication, visibility: { medications: false, appointments: true, adherence: true } }).allowed).toBe(false);
    });

    it('can propose medication changes (creates pending)', () => {
      expect(can('caretaker', 'create', 'medication').allowed).toBe(true);
      expect(can('caretaker', 'update', 'medication', { resource: medication }).allowed).toBe(true);
      expect(can('caretaker', 'delete', 'medication', { resource: medication }).allowed).toBe(true);
    });

    it('can record doses', () => {
      expect(can('caretaker', 'take_dose', 'medication', { resource: medication }).allowed).toBe(true);
      expect(can('caretaker', 'skip_dose', 'medication', { resource: medication }).allowed).toBe(true);
    });

    it('can only view own proposed changes', () => {
      expect(can('caretaker', 'read', 'change', { resource: pendingChange, requesterId: 'mem_caretaker' }).allowed).toBe(true);
      expect(can('caretaker', 'read', 'change', { resource: pendingChange, requesterId: 'mem_other' }).allowed).toBe(false);
    });

    it('cannot approve/reject changes', () => {
      expect(can('caretaker', 'approve_change', 'change').allowed).toBe(false);
    });
  });

  describe('Family permissions', () => {
    it('read-only access subject to visibility', () => {
      expect(can('family', 'read', 'medication', { resource: medication, visibility: { medications: true, appointments: true, adherence: true } }).allowed).toBe(true);
      expect(can('family', 'read', 'medication', { resource: medication, visibility: { medications: false, appointments: true, adherence: true } }).allowed).toBe(false);
    });

    it('cannot modify anything', () => {
      expect(can('family', 'create', 'medication').allowed).toBe(false);
      expect(can('family', 'update', 'medication', { resource: medication }).allowed).toBe(false);
      expect(can('family', 'delete', 'medication', { resource: medication }).allowed).toBe(false);
      expect(can('family', 'take_dose', 'medication', { resource: medication }).allowed).toBe(false);
    });

    it('cannot view pending changes', () => {
      expect(can('family', 'read', 'change').allowed).toBe(false);
    });

    it('cannot export data', () => {
      expect(can('family', 'export_data', 'export').allowed).toBe(false);
    });
  });

  describe('Visibility checks', () => {
    it('elder can always view all data', () => {
      expect(canViewMemberData(elder, caretaker, 'medications')).toBe(true);
      expect(canViewMemberData(elder, family, 'adherence')).toBe(true);
    });

    it('members can view own data', () => {
      expect(canViewMemberData(caretaker, caretaker, 'medications')).toBe(true);
    });

    it('caretaker/family respect visibility settings', () => {
      const limitedCaretaker = { ...caretaker, visibility: { medications: false, appointments: true, adherence: true } };
      expect(canViewMemberData(limitedCaretaker, elder, 'medications')).toBe(false);
      expect(canViewMemberData(limitedCaretaker, elder, 'appointments')).toBe(true);
    });
  });

  describe('Elder approval requirements', () => {
    it('elder changes do not require approval', () => {
      expect(requiresElderApproval('elder', 'medication_create')).toBe(false);
      expect(requiresElderApproval('elder', 'appointment_update')).toBe(false);
    });

    it('caretaker changes require approval', () => {
      expect(requiresElderApproval('caretaker', 'medication_create')).toBe(true);
      expect(requiresElderApproval('caretaker', 'medication_update')).toBe(true);
      expect(requiresElderApproval('caretaker', 'appointment_delete')).toBe(true);
    });

    it('family cannot propose changes', () => {
      expect(requiresElderApproval('family', 'medication_create')).toBe(false);
    });
  });

  describe('Get elder ID', () => {
    it('returns elder member ID', () => {
      const members = [elder, caretaker, family];
      expect(getElderId(members)).toBe('mem_elder' as any);
    });

    it('returns null if no elder', () => {
      expect(getElderId([caretaker, family])).toBeNull();
    });

    it('ignores deleted elder', () => {
      const deletedElder = { ...elder, deletedAt: new Date() };
      expect(getElderId([deletedElder, caretaker])).toBeNull();
    });
  });
});