/**
 * Tests for adherence calculations (PDC, on-time rate)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  calculatePDC, 
  calculateOnTimeRate, 
  calculateAverageDelay, 
  calculateAdherence,
  calculateHouseholdAdherence,
  getDefaultAdherencePeriod,
  formatAdherencePercentage,
  getAdherenceStatus
} from '@/lib/adherence';
import { Medication, DoseRecord, DoseStatus, DateRange } from '@/types';

describe('Adherence Calculations', () => {
  const timezone = 'Asia/Kolkata';
  const period: DateRange = {
    start: new Date('2024-01-01T00:00:00Z'),
    end: new Date('2024-01-31T23:59:59Z')
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
    times: ['09:00', '21:00'],
    stockRemaining: 60,
    refillThresholdDays: 7,
    notes: null,
    createdBy: 'mem_elder' as any,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should calculate PDC correctly', () => {
    // 31 days in Jan, 2 doses/day = 62 scheduled doses
    // Take 30 days worth = 60 doses taken = 30/31 days covered
    const doses: DoseRecord[] = [];
    for (let day = 1; day <= 30; day++) {
      const date = new Date(`2024-01-${day.toString().padStart(2, '0')}T09:00:00Z`);
      doses.push(
        { id: `dose_${day}a`, householdId: 'hh_1' as any, medicationId: 'med_1' as any, scheduledAt: date, takenAt: date, status: 'taken', takenBy: 'mem_elder' as any, notedBy: null, note: null, createdAt: new Date(), updatedAt: new Date() },
        { id: `dose_${day}b`, householdId: 'hh_1' as any, medicationId: 'med_1' as any, scheduledAt: new Date(date.getTime() + 12*60*60*1000), takenAt: new Date(date.getTime() + 12*60*60*1000), status: 'taken', takenBy: 'mem_elder' as any, notedBy: null, note: null, createdAt: new Date(), updatedAt: new Date() }
      );
    }
    // Miss last day
    const pdc = calculatePDC(medication, doses, period, timezone);
    expect(pdc).toBeCloseTo(30/31, 2);
  });

  it('should return 1 for medication with no scheduled doses', () => {
    const asNeededMed: Medication = { ...medication, frequency: 'as_needed', times: [] };
    const doses: DoseRecord[] = [];
    const pdc = calculatePDC(asNeededMed, doses, period, timezone);
    expect(pdc).toBe(1);
  });

  it('should calculate on-time rate correctly', () => {
    const doses: DoseRecord[] = [
      { id: '1', householdId: 'hh_1' as any, medicationId: 'med_1' as any, scheduledAt: new Date('2024-01-01T09:00:00Z'), takenAt: new Date('2024-01-01T09:15:00Z'), status: 'taken', takenBy: 'mem_elder' as any, notedBy: null, note: null, createdAt: new Date(), updatedAt: new Date() }, // 15 min late - on time
      { id: '2', householdId: 'hh_1' as any, medicationId: 'med_1' as any, scheduledAt: new Date('2024-01-01T21:00:00Z'), takenAt: new Date('2024-01-01T21:45:00Z'), status: 'taken', takenBy: 'mem_elder' as any, notedBy: null, note: null, createdAt: new Date(), updatedAt: new Date() }, // 45 min late - not on time
      { id: '3', householdId: 'hh_1' as any, medicationId: 'med_1' as any, scheduledAt: new Date('2024-01-02T09:00:00Z'), takenAt: new Date('2024-01-02T08:45:00Z'), status: 'taken', takenBy: 'mem_elder' as any, notedBy: null, note: null, createdAt: new Date(), updatedAt: new Date() }, // 15 min early - on time
    ];
    const rate = calculateOnTimeRate(doses, 30, timezone);
    expect(rate).toBeCloseTo(2/3, 2);
  });

  it('should return 0 for no taken doses', () => {
    const doses: DoseRecord[] = [
      { id: '1', householdId: 'hh_1' as any, medicationId: 'med_1' as any, scheduledAt: new Date(), takenAt: null, status: 'missed', takenBy: null, notedBy: null, note: null, createdAt: new Date(), updatedAt: new Date() }
    ];
    const rate = calculateOnTimeRate(doses, 30, timezone);
    expect(rate).toBe(0);
  });

  it('should calculate average delay', () => {
    const doses: DoseRecord[] = [
      { id: '1', householdId: 'hh_1' as any, medicationId: 'med_1' as any, scheduledAt: new Date('2024-01-01T09:00:00Z'), takenAt: new Date('2024-01-01T09:10:00Z'), status: 'taken', takenBy: 'mem_elder' as any, notedBy: null, note: null, createdAt: new Date(), updatedAt: new Date() }, // +10 min
      { id: '2', householdId: 'hh_1' as any, medicationId: 'med_1' as any, scheduledAt: new Date('2024-01-01T21:00:00Z'), takenAt: new Date('2024-01-01T20:50:00Z'), status: 'taken', takenBy: 'mem_elder' as any, notedBy: null, note: null, createdAt: new Date(), updatedAt: new Date() }, // -10 min
    ];
    const avg = calculateAverageDelay(doses, timezone);
    expect(avg).toBeCloseTo(0, 0); // Average of +10 and -10 = 0
  });

  it('should return null for no taken doses', () => {
    const doses: DoseRecord[] = [
      { id: '1', householdId: 'hh_1' as any, medicationId: 'med_1' as any, scheduledAt: new Date(), takenAt: null, status: 'missed', takenBy: null, notedBy: null, note: null, createdAt: new Date(), updatedAt: new Date() }
    ];
    const avg = calculateAverageDelay(doses, timezone);
    expect(avg).toBeNull();
  });

  it('should calculate full adherence result', () => {
    const doses: DoseRecord[] = [
      { id: '1', householdId: 'hh_1' as any, medicationId: 'med_1' as any, scheduledAt: new Date('2024-01-01T09:00:00Z'), takenAt: new Date('2024-01-01T09:00:00Z'), status: 'taken', takenBy: 'mem_elder' as any, notedBy: null, note: null, createdAt: new Date(), updatedAt: new Date() },
      { id: '2', householdId: 'hh_1' as any, medicationId: 'med_1' as any, scheduledAt: new Date('2024-01-01T21:00:00Z'), takenAt: null, status: 'missed', takenBy: null, notedBy: null, note: null, createdAt: new Date(), updatedAt: new Date() },
      { id: '3', householdId: 'hh_1' as any, medicationId: 'med_1' as any, scheduledAt: new Date('2024-01-02T09:00:00Z'), takenAt: new Date('2024-01-02T09:00:00Z'), status: 'taken', takenBy: 'mem_elder' as any, notedBy: null, note: null, createdAt: new Date(), updatedAt: new Date() },
      { id: '4', householdId: 'hh_1' as any, medicationId: 'med_1' as any, scheduledAt: new Date('2024-01-02T21:00:00Z'), takenAt: new Date('2024-01-02T21:00:00Z'), status: 'skipped', takenBy: 'mem_elder' as any, notedBy: 'mem_elder' as any, note: 'Felt better', createdAt: new Date(), updatedAt: new Date() },
    ];
    const result = calculateAdherence(medication, doses, period, timezone);
    
    expect(result.medicationId).toBe('med_1' as any);
    expect(result.medicationName).toBe('Test Med');
    expect(result.totalScheduled).toBeGreaterThan(0);
    expect(result.totalTaken).toBe(2);
    expect(result.totalMissed).toBe(1);
    expect(result.totalSkipped).toBe(1);
    expect(result.pdc).toBeGreaterThanOrEqual(0);
    expect(result.pdc).toBeLessThanOrEqual(1);
    expect(result.onTimeRate).toBeGreaterThanOrEqual(0);
    expect(result.onTimeRate).toBeLessThanOrEqual(1);
  });

  it('should calculate household adherence for multiple medications', () => {
    const med2: Medication = { ...medication, id: 'med_2' as any, name: 'Med 2', times: ['08:00'] };
    const doses: DoseRecord[] = [
      { id: '1', householdId: 'hh_1' as any, medicationId: 'med_1' as any, scheduledAt: new Date('2024-01-01T09:00:00Z'), takenAt: new Date('2024-01-01T09:00:00Z'), status: 'taken', takenBy: 'mem_elder' as any, notedBy: null, note: null, createdAt: new Date(), updatedAt: new Date() },
      { id: '2', householdId: 'hh_1' as any, medicationId: 'med_2' as any, scheduledAt: new Date('2024-01-01T08:00:00Z'), takenAt: new Date('2024-01-01T08:00:00Z'), status: 'taken', takenBy: 'mem_elder' as any, notedBy: null, note: null, createdAt: new Date(), updatedAt: new Date() },
    ];
    const results = calculateHouseholdAdherence([medication, med2], doses, period, timezone);
    expect(results).toHaveLength(2);
  });

  it('should format adherence percentage', () => {
    expect(formatAdherencePercentage(0.95)).toBe('95%');
    expect(formatAdherencePercentage(0.8)).toBe('80%');
    expect(formatAdherencePercentage(0.666)).toBe('67%');
  });

  it('should get adherence status labels', () => {
    expect(getAdherenceStatus(0.95)).toBe('excellent');
    expect(getAdherenceStatus(0.85)).toBe('good');
    expect(getAdherenceStatus(0.7)).toBe('fair');
    expect(getAdherenceStatus(0.5)).toBe('poor');
  });
});