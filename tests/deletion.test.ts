/**
 * Tests for household deletion
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InMemoryRepository } from '@/lib/repositories/in-memory';
import { setRepositoryForTesting, getRepository } from '@/lib/repositories';
import { Household, Member, Role, Medication, Appointment, DoseRecord, PendingChange, ActivityLogEntry, ConsentRecord } from '@/types';
import { HouseholdId, MemberId, MedicationId, AppointmentId, ChangeId, ActivityId, ConsentId } from '@/types';

describe('Household Deletion', () => {
  let repo: InMemoryRepository;
  const householdId = 'hh_1' as HouseholdId;
  const elderId = 'mem_elder' as MemberId;
  const caretakerId = 'mem_caretaker' as MemberId;

  beforeEach(() => {
    repo = new InMemoryRepository();
    setRepositoryForTesting(repo);
  });

  afterEach(() => {
    InMemoryRepository.clear();
  });

  it('creates household with elder', async () => {
    const household = await repo.createHousehold({
      name: 'Test',
      timezone: 'Asia/Kolkata',
      createdBy: elderId,
    });
    expect(household.id).toBe(householdId);
    expect(household.deletedAt).toBeNull();
  });

  it('soft deletes household', async () => {
    await repo.createHousehold({
      name: 'Test',
      timezone: 'Asia/Kolkata',
      createdBy: elderId,
    });

    const result = await repo.deleteHousehold(householdId);
    expect(result).toBe(true);

    const household = await repo.getHousehold(householdId);
    expect(household).toBeNull(); // getHousehold filters deleted
  });

  it('deletes all members', async () => {
    await repo.createHousehold({ name: 'Test', timezone: 'Asia/Kolkata', createdBy: elderId });
    await repo.createMember({ householdId, role: 'elder', displayName: 'Elder', passcodeHash: 'h', passcodeSalt: 's', email: null, emailVerified: false, muteSettings: { doseReminders: false, missedDoseAlerts: false, appointmentReminders: false, criticalOnly: false }, visibility: { medications: true, appointments: true, adherence: true } });
    await repo.createMember({ householdId, role: 'caretaker', displayName: 'Caretaker', passcodeHash: 'h', passcodeSalt: 's', email: null, emailVerified: false, muteSettings: { doseReminders: false, missedDoseAlerts: false, appointmentReminders: false, criticalOnly: false }, visibility: { medications: true, appointments: true, adherence: true } });

    await repo.deleteHousehold(householdId);

    const members = await repo.getMembersByHousehold(householdId);
    expect(members).toHaveLength(0);
  });

  it('deletes all medications', async () => {
    await repo.createHousehold({ name: 'Test', timezone: 'Asia/Kolkata', createdBy: elderId });
    await repo.createMedication({ householdId, name: 'Med', genericName: null, dosage: '10', unit: 'mg', instructions: null, frequency: 'daily', customSchedule: null, startDate: new Date(), endDate: null, times: ['09:00'], stockRemaining: 30, refillThresholdDays: 7, notes: null, createdBy: elderId });

    await repo.deleteHousehold(householdId);

    const meds = await repo.getMedicationsByHousehold(householdId, true);
    expect(meds).toHaveLength(0);
  });

  it('deletes all doses', async () => {
    await repo.createHousehold({ name: 'Test', timezone: 'Asia/Kolkata', createdBy: elderId });
    const med = await repo.createMedication({ householdId, name: 'Med', genericName: null, dosage: '10', unit: 'mg', instructions: null, frequency: 'daily', customSchedule: null, startDate: new Date(), endDate: null, times: ['09:00'], stockRemaining: 30, refillThresholdDays: 7, notes: null, createdBy: elderId });
    await repo.createDose({ householdId, medicationId: med.id, scheduledAt: new Date(), takenAt: null, status: 'pending', takenBy: null, notedBy: null, note: null });

    await repo.deleteHousehold(householdId);

    const doses = await repo.getDosesByHousehold(householdId);
    expect(doses).toHaveLength(0);
  });

  it('deletes all appointments', async () => {
    await repo.createHousehold({ name: 'Test', timezone: 'Asia/Kolkata', createdBy: elderId });
    await repo.createAppointment({ householdId, title: 'Apt', description: null, provider: null, location: null, scheduledAt: new Date(), durationMinutes: 30, status: 'scheduled', reminderSent: false, createdBy: elderId });

    await repo.deleteHousehold(householdId);

    const apts = await repo.getAppointmentsByHousehold(householdId, true);
    expect(apts).toHaveLength(0);
  });

  it('deletes all pending changes', async () => {
    await repo.createHousehold({ name: 'Test', timezone: 'Asia/Kolkata', createdBy: elderId });
    await repo.createChange({ householdId, type: 'medication_create', resourceId: 'med_1' as MedicationId, proposedData: {}, currentData: null, requestedBy: caretakerId, status: 'pending', decidedBy: null, decidedAt: null, decisionNote: null, expiresAt: new Date(Date.now() + 86400000) });

    await repo.deleteHousehold(householdId);

    const changes = await repo.getChangesByHousehold(householdId);
    expect(changes).toHaveLength(0);
  });

  it('deletes all activity logs', async () => {
    await repo.createHousehold({ name: 'Test', timezone: 'Asia/Kolkata', createdBy: elderId });
    await repo.createActivityLog({ householdId, memberId: elderId, action: 'test', resourceType: 'household', resourceId: null, metadata: {}, ipAddress: null, userAgent: null });

    await repo.deleteHousehold(householdId);

    const { entries } = await repo.getActivityLog(householdId);
    expect(entries).toHaveLength(0);
  });

  it('deletes all consents', async () => {
    await repo.createHousehold({ name: 'Test', timezone: 'Asia/Kolkata', createdBy: elderId });
    await repo.createConsent({ householdId, memberId: elderId, type: 'data_processing', version: 1, granted: true, grantedAt: new Date(), revokedAt: null });

    await repo.deleteHousehold(householdId);

    const consents = await repo.getConsentsByHousehold(householdId);
    expect(consents).toHaveLength(0);
  });
});