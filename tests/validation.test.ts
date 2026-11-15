/**
 * Tests for zod validation schemas
 */

import { describe, it, expect } from 'vitest';
import { 
  createHouseholdSchema, 
  loginSchema, 
  addMemberSchema, 
  createMedicationSchema, 
  updateMedicationSchema,
  doseActionSchema,
  createAppointmentSchema,
  updateAppointmentSchema,
  decideChangeSchema,
  visibilitySchema,
  updateVisibilitySchema,
  consentSchema,
  bulkConsentSchema,
  prescriptionScanSchema,
  explainMedicineSchema,
  interactionCheckSchema,
  cronRemindersSchema,
  paginationSchema
} from '@/lib/validation';

describe('Validation Schemas', () => {
  describe('createHouseholdSchema', () => {
    it('validates valid household data', () => {
      const data = {
        name: 'Test Household',
        timezone: 'Asia/Kolkata',
        elderDisplayName: 'Grandma',
        elderPasscode: '123456',
        elderEmail: 'elder@example.com',
        creatorAgeConfirmed: true
      };
      const result = createHouseholdSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('rejects elder passcode with less than 6 digits', () => {
      const data = { ...validHousehold(), elderPasscode: '12345' };
      const result = createHouseholdSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('rejects non-numeric elder passcode', () => {
      const data = { ...validHousehold(), elderPasscode: 'abcdef' };
      const result = createHouseholdSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('requires creatorAgeConfirmed to be true', () => {
      const data = { ...validHousehold(), creatorAgeConfirmed: false };
      const result = createHouseholdSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('loginSchema', () => {
    it('validates valid login', () => {
      const data = { householdId: 'hh_1', passcode: '123456' };
      const result = loginSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('requires householdId and passcode', () => {
      const result = loginSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe('addMemberSchema', () => {
    it('validates caretaker with 8+ char passcode', () => {
      const data = { role: 'caretaker' as const, displayName: 'Daughter', passcode: 'abcdefgh', email: 'caretaker@example.com' };
      const result = addMemberSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('validates family member', () => {
      const data = { role: 'family' as const, displayName: 'Son', passcode: 'ijklmnop' };
      const result = addMemberSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('rejects passcode less than 8 chars for non-elder', () => {
      const data = { role: 'caretaker' as const, displayName: 'Test', passcode: 'short' };
      const result = addMemberSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('rejects invalid role', () => {
      const data = { role: 'invalid', displayName: 'Test', passcode: 'abcdefgh' };
      const result = addMemberSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('createMedicationSchema', () => {
    it('validates daily medication', () => {
      const data = validMedication();
      const result = createMedicationSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('validates custom frequency with schedule', () => {
      const data = { 
        ...validMedication(), 
        frequency: 'custom' as const,
        customSchedule: { type: 'interval' as const, intervalDays: 2, daysOfWeek: null, daysOfMonth: null }
      };
      const result = createMedicationSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('rejects custom frequency without schedule', () => {
      const data = { ...validMedication(), frequency: 'custom' as const, customSchedule: null };
      const result = createMedicationSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('rejects end date before start date', () => {
      const data = { ...validMedication(), startDate: '2024-01-15', endDate: '2024-01-10' };
      const result = createMedicationSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('requires at least one time', () => {
      const data = { ...validMedication(), times: [] };
      const result = createMedicationSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('validates time format HH:mm', () => {
      const data = { ...validMedication(), times: ['25:00'] };
      const result = createMedicationSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('doseActionSchema', () => {
    it('validates taken status', () => {
      const data = { status: 'taken' as const, takenBy: 'mem_1', note: 'Taken with food' };
      const result = doseActionSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('validates skipped status', () => {
      const data = { status: 'skipped' as const, note: 'Felt better' };
      const result = doseActionSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('rejects invalid status', () => {
      const data = { status: 'invalid' };
      const result = doseActionSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('createAppointmentSchema', () => {
    it('validates valid appointment', () => {
      const data = {
        title: 'Doctor Visit',
        description: 'Annual checkup',
        provider: 'Dr. Smith',
        location: 'City Hospital',
        scheduledAt: '2024-01-15T10:00:00Z',
        durationMinutes: 30
      };
      const result = createAppointmentSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('requires title', () => {
      const data = { title: '', scheduledAt: '2024-01-15T10:00:00Z' };
      const result = createAppointmentSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('validates ISO datetime', () => {
      const data = { title: 'Test', scheduledAt: 'not-a-date' };
      const result = createAppointmentSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('decideChangeSchema', () => {
    it('validates approve decision', () => {
      const data = { decision: 'approve' as const, note: 'Approved' };
      const result = decideChangeSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('validates reject decision', () => {
      const data = { decision: 'reject' as const };
      const result = decideChangeSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('rejects invalid decision', () => {
      const data = { decision: 'maybe' };
      const result = decideChangeSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('visibilitySchema', () => {
    it('validates visibility settings', () => {
      const data = { medications: true, appointments: false, adherence: true };
      const result = visibilitySchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('requires all three fields', () => {
      const result = visibilitySchema.safeParse({ medications: true });
      expect(result.success).toBe(false);
    });
  });

  describe('consentSchema', () => {
    it('validates consent types', () => {
      expect(consentSchema.safeParse({ type: 'data_processing', granted: true }).success).toBe(true);
      expect(consentSchema.safeParse({ type: 'ai_photo_processing', granted: false }).success).toBe(true);
      expect(consentSchema.safeParse({ type: 'email_reminders', granted: true }).success).toBe(true);
    });

    it('rejects invalid type', () => {
      const result = consentSchema.safeParse({ type: 'invalid', granted: true });
      expect(result.success).toBe(false);
    });
  });

  describe('prescriptionScanSchema', () => {
    it('validates image data', () => {
      const data = { imageBase64: 'base64data', mimeType: 'image/jpeg' as const };
      const result = prescriptionScanSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('rejects invalid mime type', () => {
      const data = { imageBase64: 'data', mimeType: 'application/pdf' };
      const result = prescriptionScanSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('requires image data', () => {
      const result = prescriptionScanSchema.safeParse({ mimeType: 'image/jpeg' });
      expect(result.success).toBe(false);
    });
  });

  describe('explainMedicineSchema', () => {
    it('validates medicine explanation request', () => {
      const data = { name: 'Aspirin', genericName: 'Acetylsalicylic acid', dosage: '100mg' };
      const result = explainMedicineSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('requires name', () => {
      const result = explainMedicineSchema.safeParse({ genericName: 'Test' });
      expect(result.success).toBe(false);
    });
  });

  describe('interactionCheckSchema', () => {
    it('validates interaction check with 2+ medications', () => {
      const data = { medications: [{ name: 'Med A' }, { name: 'Med B' }] };
      const result = interactionCheckSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('rejects less than 2 medications', () => {
      const data = { medications: [{ name: 'Med A' }] };
      const result = interactionCheckSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('rejects more than 20 medications', () => {
      const data = { medications: Array(21).fill({ name: 'Med' }) };
      const result = interactionCheckSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('cronRemindersSchema', () => {
    it('validates cron payload', () => {
      const data = { timestamp: '2024-01-15T10:00:00Z', trigger: 'scheduled' as const };
      const result = cronRemindersSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('defaults trigger to scheduled', () => {
      const data = { timestamp: '2024-01-15T10:00:00Z' };
      const result = cronRemindersSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (!result.success) throw new Error('Expected cron payload to validate');
      expect(result.data.trigger).toBe('scheduled');
    });
  });

  describe('paginationSchema', () => {
    it('defaults limit to 50', () => {
      const result = paginationSchema.safeParse({});
      expect(result.success).toBe(true);
      if (!result.success) throw new Error('Expected pagination defaults to validate');
      expect(result.data.limit).toBe(50);
    });

    it('clamps limit to 1-100', () => {
      expect(paginationSchema.safeParse({ limit: 0 }).success).toBe(false);
      expect(paginationSchema.safeParse({ limit: 101 }).success).toBe(false);
      expect(paginationSchema.safeParse({ limit: 50 }).success).toBe(true);
    });
  });
});

function validHousehold() {
  return {
    name: 'Test Household',
    timezone: 'Asia/Kolkata',
    elderDisplayName: 'Grandma',
    elderPasscode: '123456',
    elderEmail: 'elder@example.com',
    creatorAgeConfirmed: true
  };
}

function validMedication() {
  return {
    name: 'Test Med',
    genericName: 'Generic',
    dosage: '10',
    unit: 'mg',
    instructions: 'Take with food',
    frequency: 'daily' as const,
    customSchedule: null,
    startDate: '2024-01-01',
    endDate: null,
    times: ['09:00', '21:00'],
    stockRemaining: 30,
    refillThresholdDays: 7,
    notes: 'Test notes'
  };
}