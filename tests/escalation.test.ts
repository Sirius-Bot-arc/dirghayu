/**
 * Tests for escalation logic
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculateEscalation, shouldMarkAsMissed, getEscalationRecipients, shouldSendEscalationEmail } from '@/lib/escalation';
import { Member, Role, Medication, DoseRecord, DoseStatus } from '@/types';

describe('Escalation Logic', () => {
  const now = new Date('2024-01-15T10:00:00Z');
  const scheduledAt = new Date('2024-01-15T09:00:00Z'); // 60 min ago
  
  const elder: Member = {
    id: 'mem_elder' as any,
    householdId: 'hh_1' as any,
    role: 'elder',
    displayName: 'Grandma',
    passcodeHash: '',
    passcodeSalt: '',
    email: 'elder@example.com',
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
    displayName: 'Daughter',
    email: 'caretaker@example.com'
  };

  const family: Member = {
    ...elder,
    id: 'mem_family' as any,
    role: 'family',
    displayName: 'Grandchild',
    email: 'family@example.com'
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
    startDate: new Date('2024-01-01'),
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

  const baseDose: DoseRecord = {
    id: 'dose_1',
    householdId: 'hh_1' as any,
    medicationId: 'med_1' as any,
    scheduledAt,
    takenAt: null,
    status: 'missed',
    takenBy: null,
    notedBy: null,
    note: null,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const members = [elder, caretaker, family];

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should escalate to elder at stage 0 (immediate)', () => {
    const dose = { ...baseDose, status: 'missed' as DoseStatus };
    const result = calculateEscalation(dose, medication, members, now, 30, 60);
    
    expect(result.shouldEscalate).toBe(true);
    expect(result.stage).toBe(0);
    expect(result.recipients).toHaveLength(1);
    expect(result.recipients[0].role).toBe('elder');
    expect(result.minutesOverdue).toBe(60);
  });

  it('should escalate to caretaker at stage 1 (after 30 min)', () => {
    const dose = { ...baseDose, status: 'missed' as DoseStatus };
    // 45 minutes overdue - past elder stage, into caretaker stage
    const later = new Date('2024-01-15T09:45:00Z');
    const result = calculateEscalation(dose, medication, members, later, 30, 60);
    
    expect(result.shouldEscalate).toBe(true);
    expect(result.stage).toBe(1);
    expect(result.recipients).toHaveLength(1);
    expect(result.recipients[0].role).toBe('caretaker');
  });

  it('should escalate to family at stage 2 (after 90 min total)', () => {
    const dose = { ...baseDose, status: 'missed' as DoseStatus };
    // 100 minutes overdue - past caretaker stage, into family stage
    const later = new Date('2024-01-15T10:40:00Z');
    const result = calculateEscalation(dose, medication, members, later, 30, 60);
    
    expect(result.shouldEscalate).toBe(true);
    expect(result.stage).toBe(2);
    expect(result.recipients).toHaveLength(1);
    expect(result.recipients[0].role).toBe('family');
  });

  it('should not escalate if dose is not missed', () => {
    const dose = { ...baseDose, status: 'taken' as DoseStatus };
    const result = calculateEscalation(dose, medication, members, now, 30, 60);
    
    expect(result.shouldEscalate).toBe(false);
  });

  it('should not escalate if dose is pending but not overdue', () => {
    const dose = { ...baseDose, status: 'pending' as DoseStatus, scheduledAt: new Date(now.getTime() + 30 * 60 * 1000) };
    const result = calculateEscalation(dose, medication, members, now, 30, 60);
    
    expect(result.shouldEscalate).toBe(false);
  });

  it('should mark dose as missed after grace period', () => {
    const dose = { ...baseDose, status: 'pending' as DoseStatus };
    const result = shouldMarkAsMissed(dose, 30, now);
    
    expect(result).toBe(true);
  });

  it('should not mark dose as missed within grace period', () => {
    const dose = { ...baseDose, status: 'pending' as DoseStatus, scheduledAt: new Date(now.getTime() - 15 * 60 * 1000) };
    const result = shouldMarkAsMissed(dose, 30, now);
    
    expect(result).toBe(false);
  });

  it('should get correct recipients for each stage', () => {
    expect(getEscalationRecipients(members, 0)).toHaveLength(1);
    expect(getEscalationRecipients(members, 0)[0].role).toBe('elder');
    
    expect(getEscalationRecipients(members, 1)).toHaveLength(1);
    expect(getEscalationRecipients(members, 1)[0].role).toBe('caretaker');
    
    expect(getEscalationRecipients(members, 2)).toHaveLength(1);
    expect(getEscalationRecipients(members, 2)[0].role).toBe('family');
  });

  it('should respect mute settings for escalation emails', () => {
    const mutedCaretaker = { ...caretaker, muteSettings: { ...caretaker.muteSettings, missedDoseAlerts: true } };
    const membersWithMute = [elder, mutedCaretaker, family];
    
    expect(shouldSendEscalationEmail(mutedCaretaker, 1)).toBe(false);
    expect(shouldSendEscalationEmail(caretaker, 1)).toBe(true);
  });

  it('should respect criticalOnly setting', () => {
    const criticalOnlyMember = { ...caretaker, muteSettings: { ...caretaker.muteSettings, criticalOnly: true } };
    
    expect(shouldSendEscalationEmail(criticalOnlyMember, 0)).toBe(true); // Elder reminders still sent
    expect(shouldSendEscalationEmail(criticalOnlyMember, 1)).toBe(false); // Escalations blocked
    expect(shouldSendEscalationEmail(criticalOnlyMember, 2)).toBe(false);
  });
});