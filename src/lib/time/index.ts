/**
 * Timezone-aware time utilities
 * All time logic uses household timezone (default Asia/Kolkata)
 * Schedules stored as local HH:mm strings
 */

import { formatInTimeZone, zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz';
import { addMinutes, isBefore, isAfter, isEqual, startOfDay, endOfDay, differenceInMinutes, parse, format, addDays, setHours, setMinutes } from 'date-fns';

export const DEFAULT_TIMEZONE = 'Asia/Kolkata';

/**
 * Get current time in household timezone
 */
export function nowInTimezone(timezone: string = DEFAULT_TIMEZONE): Date {
  return utcToZonedTime(new Date(), timezone);
}

/**
 * Convert a UTC date to household timezone
 */
export function toHouseholdTime(utcDate: Date, timezone: string = DEFAULT_TIMEZONE): Date {
  return utcToZonedTime(utcDate, timezone);
}

/**
 * Convert a household timezone date to UTC
 */
export function toUtc(zonedDate: Date, timezone: string = DEFAULT_TIMEZONE): Date {
  return zonedTimeToUtc(zonedDate, timezone);
}

/**
 * Parse HH:mm string in household timezone to UTC Date
 */
export function parseLocalTime(timeString: string, date: Date, timezone: string = DEFAULT_TIMEZONE): Date {
  const [hours, minutes] = timeString.split(':').map(Number);
  const zonedDate = setMinutes(setHours(date, hours), minutes);
  return zonedTimeToUtc(zonedDate, timezone);
}

/**
 * Format a UTC date as HH:mm in household timezone
 */
export function formatLocalTime(utcDate: Date, timezone: string = DEFAULT_TIMEZONE): string {
  return formatInTimeZone(utcDate, timezone, 'HH:mm');
}

/**
 * Format a UTC date as full date string in household timezone
 */
export function formatLocalDate(utcDate: Date, timezone: string = DEFAULT_TIMEZONE): string {
  return formatInTimeZone(utcDate, timezone, 'yyyy-MM-dd');
}

/**
 * Format a UTC date as full datetime string in household timezone
 */
export function formatLocalDateTime(utcDate: Date, timezone: string = DEFAULT_TIMEZONE): string {
  return formatInTimeZone(utcDate, timezone, 'yyyy-MM-dd HH:mm');
}

/**
 * Get start of day in household timezone as UTC
 */
export function startOfDayInTimezone(date: Date, timezone: string = DEFAULT_TIMEZONE): Date {
  const zoned = utcToZonedTime(date, timezone);
  const start = startOfDay(zoned);
  return zonedTimeToUtc(start, timezone);
}

/**
 * Get end of day in household timezone as UTC
 */
export function endOfDayInTimezone(date: Date, timezone: string = DEFAULT_TIMEZONE): Date {
  const zoned = utcToZonedTime(date, timezone);
  const end = endOfDay(zoned);
  return zonedTimeToUtc(end, timezone);
}

/**
 * Check if a dose is overdue (past scheduled time + grace window)
 */
export function isDoseOverdue(scheduledAt: Date, graceMinutes: number = 30, timezone: string = DEFAULT_TIMEZONE): boolean {
  const now = nowInTimezone(timezone);
  const scheduledZoned = utcToZonedTime(scheduledAt, timezone);
  const deadline = addMinutes(scheduledZoned, graceMinutes);
  return isAfter(now, deadline);
}

/**
 * Check if a dose is within the on-time window
 */
export function isDoseOnTime(takenAt: Date, scheduledAt: Date, windowMinutes: number = 30, timezone: string = DEFAULT_TIMEZONE): boolean {
  const takenZoned = utcToZonedTime(takenAt, timezone);
  const scheduledZoned = utcToZonedTime(scheduledAt, timezone);
  const diff = differenceInMinutes(takenZoned, scheduledZoned);
  return diff >= -windowMinutes && diff <= windowMinutes;
}

/**
 * Calculate minutes until a scheduled time
 */
export function minutesUntil(scheduledAt: Date, timezone: string = DEFAULT_TIMEZONE): number {
  const now = nowInTimezone(timezone);
  const scheduledZoned = utcToZonedTime(scheduledAt, timezone);
  return differenceInMinutes(scheduledZoned, now);
}

/**
 * Generate dose schedule for a medication over a date range
 */
export function generateDoseSchedule(
  medication: { times: string[]; startDate: Date; endDate: Date | null; frequency: string; customSchedule: CustomSchedule | null },
  rangeStart: Date,
  rangeEnd: Date,
  timezone: string = DEFAULT_TIMEZONE
): Date[] {
  const doses: Date[] = [];
  const start = startOfDayInTimezone(rangeStart, timezone);
  const end = endOfDayInTimezone(rangeEnd, timezone);
  const medStart = startOfDayInTimezone(medication.startDate, timezone);
  const medEnd = medication.endDate ? endOfDayInTimezone(medication.endDate, timezone) : end;

  const effectiveStart = isAfter(start, medStart) ? start : medStart;
  const effectiveEnd = isBefore(end, medEnd) ? end : medEnd;

  let current = effectiveStart;

  while (isBefore(current, effectiveEnd) || isEqual(current, effectiveEnd)) {
    const dayOfWeek = utcToZonedTime(current, timezone).getDay(); // 0 = Sunday
    const dayOfMonth = utcToZonedTime(current, timezone).getDate();

    let shouldDose = false;

    switch (medication.frequency) {
      case 'daily':
        shouldDose = true;
        break;
      case 'weekly':
        // Weekly on the same day as start date
        shouldDose = dayOfWeek === utcToZonedTime(medication.startDate, timezone).getDay();
        break;
      case 'monthly':
        shouldDose = dayOfMonth === utcToZonedTime(medication.startDate, timezone).getDate();
        break;
      case 'as_needed':
        shouldDose = false; // No scheduled doses
        break;
      case 'custom':
        if (medication.customSchedule) {
          switch (medication.customSchedule.type) {
            case 'interval':
              if (medication.customSchedule.intervalDays) {
                const diffDays = differenceInMinutes(current, medStart) / (60 * 24);
                shouldDose = diffDays % medication.customSchedule.intervalDays === 0;
              }
              break;
            case 'days_of_week':
              shouldDose = medication.customSchedule.daysOfWeek?.includes(dayOfWeek) ?? false;
              break;
            case 'days_of_month':
              shouldDose = medication.customSchedule.daysOfMonth?.includes(dayOfMonth) ?? false;
              break;
          }
        }
        break;
    }

    if (shouldDose) {
      for (const timeStr of medication.times) {
        const doseTime = parseLocalTime(timeStr, current, timezone);
        if ((isAfter(doseTime, start) || isEqual(doseTime, start)) && (isBefore(doseTime, end) || isEqual(doseTime, end))) {
          doses.push(doseTime);
        }
      }
    }

    current = addDays(current, 1);
  }

  return doses.sort((a, b) => a.getTime() - b.getTime());
}

/**
 * Get the next scheduled dose time after a given time
 */
export function getNextDoseTime(
  medication: { times: string[]; startDate: Date; endDate: Date | null; frequency: string; customSchedule: CustomSchedule | null },
  after: Date,
  timezone: string = DEFAULT_TIMEZONE
): Date | null {
  const searchEnd = addDays(after, 30); // Look ahead 30 days max
  const doses = generateDoseSchedule(medication, after, searchEnd, timezone);
  return doses[0] ?? null;
}

/** Custom schedule type (re-exported for convenience) */
export interface CustomSchedule {
  type: 'interval' | 'days_of_week' | 'days_of_month';
  intervalDays: number | null;
  daysOfWeek: number[] | null;
  daysOfMonth: number[] | null;
}