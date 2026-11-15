/**
 * Adherence calculations
 * Pure functions for PDC (Proportion of Days Covered) and on-time rate
 * Unit-tested, timezone-aware
 */

import { Medication, DoseRecord, DateRange, AdherenceResult } from '@/types';
import { startOfDayInTimezone, endOfDayInTimezone, formatLocalDate, isDoseOnTime, generateDoseSchedule } from '@/lib/time';
import { ADHERENCE_ON_TIME_WINDOW_MIN, PDC_LOOKBACK_DAYS } from '@/lib/config';

/**
 * Calculate PDC (Proportion of Days Covered) for a medication over a period
 * PDC = Days with at least one dose taken / Total days in period
 */
export function calculatePDC(
  medication: Medication,
  doses: DoseRecord[],
  period: DateRange,
  timezone: string
): number {
  const { start, end } = period;
  
  // Generate all scheduled dose days in period
  const scheduledDoses = generateDoseSchedule(medication, start, end, timezone);
  if (scheduledDoses.length === 0) return 1; // No doses scheduled = 100% covered
  
  // Get unique scheduled days (by date in household timezone)
  const scheduledDays = new Set<string>();
  for (const doseTime of scheduledDoses) {
    scheduledDays.add(formatLocalDate(doseTime, timezone));
  }
  
  // Get unique taken days
  const takenDays = new Set<string>();
  for (const dose of doses) {
    if (dose.status === 'taken') {
      takenDays.add(formatLocalDate(dose.scheduledAt, timezone));
    }
  }
  
  // PDC = days with at least one dose taken / total scheduled days
  const coveredDays = [...scheduledDays].filter(day => takenDays.has(day)).length;
  return scheduledDays.size > 0 ? coveredDays / scheduledDays.size : 1;
}

/**
 * Calculate on-time rate for a medication
 * On-time = taken within ±window minutes of scheduled time
 */
export function calculateOnTimeRate(
  doses: DoseRecord[],
  windowMinutes: number = ADHERENCE_ON_TIME_WINDOW_MIN,
  timezone: string = 'Asia/Kolkata'
): number {
  const takenDoses = doses.filter(d => d.status === 'taken' && d.takenAt);
  if (takenDoses.length === 0) return 0;
  
  let onTimeCount = 0;
  for (const dose of takenDoses) {
    if (isDoseOnTime(dose.takenAt!, dose.scheduledAt, windowMinutes, timezone)) {
      onTimeCount++;
    }
  }
  
  return onTimeCount / takenDoses.length;
}

/**
 * Calculate average delay for taken doses (minutes)
 */
export function calculateAverageDelay(
  doses: DoseRecord[],
  timezone: string = 'Asia/Kolkata'
): number | null {
  const takenDoses = doses.filter(d => d.status === 'taken' && d.takenAt);
  if (takenDoses.length === 0) return null;
  
  let totalDelay = 0;
  for (const dose of takenDoses) {
    const takenZoned = new Date(dose.takenAt!.toLocaleString('en-US', { timeZone: timezone }));
    const scheduledZoned = new Date(dose.scheduledAt.toLocaleString('en-US', { timeZone: timezone }));
    const delay = (takenZoned.getTime() - scheduledZoned.getTime()) / (1000 * 60);
    totalDelay += delay;
  }
  
  return totalDelay / takenDoses.length;
}

/**
 * Full adherence calculation for a medication
 */
export function calculateAdherence(
  medication: Medication,
  doses: DoseRecord[],
  period: DateRange,
  timezone: string
): AdherenceResult {
  const scheduledDoses = generateDoseSchedule(medication, period.start, period.end, timezone);
  const relevantDoses = doses.filter(d => 
    d.scheduledAt >= period.start && d.scheduledAt <= period.end
  );
  
  const totalScheduled = scheduledDoses.length;
  const totalTaken = relevantDoses.filter(d => d.status === 'taken').length;
  const totalMissed = relevantDoses.filter(d => d.status === 'missed').length;
  const totalSkipped = relevantDoses.filter(d => d.status === 'skipped').length;
  
  const pdc = calculatePDC(medication, relevantDoses, period, timezone);
  const onTimeRate = calculateOnTimeRate(relevantDoses, ADHERENCE_ON_TIME_WINDOW_MIN, timezone);
  const averageDelayMinutes = calculateAverageDelay(relevantDoses, timezone);
  
  return {
    medicationId: medication.id,
    medicationName: medication.name,
    period,
    totalScheduled,
    totalTaken,
    totalMissed,
    totalSkipped,
    pdc,
    onTimeRate,
    averageDelayMinutes
  };
}

/**
 * Calculate adherence for all medications in a household
 */
export function calculateHouseholdAdherence(
  medications: Medication[],
  allDoses: DoseRecord[],
  period: DateRange,
  timezone: string
): AdherenceResult[] {
  return medications
    .filter(m => !m.deletedAt)
    .map(med => {
      const medDoses = allDoses.filter(d => d.medicationId === med.id);
      return calculateAdherence(med, medDoses, period, timezone);
    });
}

/**
 * Get default adherence period (last PDC_LOOKBACK_DAYS days)
 */
export function getDefaultAdherencePeriod(timezone: string): DateRange {
  const end = new Date();
  const start = new Date(end.getTime() - PDC_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  return {
    start: startOfDayInTimezone(start, timezone),
    end: endOfDayInTimezone(end, timezone)
  };
}

/**
 * Format adherence as percentage string
 */
export function formatAdherencePercentage(value: number): string {
  return `${Math.round(value * 100)}%`;
}

/**
 * Get adherence status label
 */
export function getAdherenceStatus(pdc: number): 'excellent' | 'good' | 'fair' | 'poor' {
  if (pdc >= 0.95) return 'excellent';
  if (pdc >= 0.8) return 'good';
  if (pdc >= 0.6) return 'fair';
  return 'poor';
}