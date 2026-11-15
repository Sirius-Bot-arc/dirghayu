/**
 * Zod validation schemas for all API inputs
 * Centralized validation to ensure consistency and security
 */

import { z } from 'zod';
import { Role, Frequency, DoseStatus, AppointmentStatus, ChangeType, ChangeStatus, ConsentType, VisibilitySettings, MuteSettings } from '@/types';

// Common schemas
export const householdIdSchema = z.string().min(1).max(64);
export const memberIdSchema = z.string().min(1).max(64);
export const medicationIdSchema = z.string().min(1).max(64);
export const appointmentIdSchema = z.string().min(1).max(64);
export const changeIdSchema = z.string().min(1).max(64);

export const timeStringSchema = z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be in HH:mm format (24-hour)');
export const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');
export const isoDateTimeSchema = z.string().datetime({ offset: true });

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional()
});

export const dateRangeSchema = z.object({
  start: dateStringSchema,
  end: dateStringSchema
}).refine(({ start, end }) => start <= end, { message: 'Start date must be before or equal to end date', path: ['end'] });

// Household schemas
export const createHouseholdSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  timezone: z.string().min(1).max(50).default('Asia/Kolkata'),
  elderDisplayName: z.string().min(1).max(100).trim(),
  elderPasscode: z.string().min(6).max(20).regex(/^\d+$/, 'Elder passcode must be 6+ digits'),
  elderEmail: z.string().email().max(254).optional().nullable(),
  creatorAgeConfirmed: z.literal(true, { errorMap: () => ({ message: 'Creator must confirm they are 18+' }) })
});

export const householdNameSchema = z.string().min(1).max(100).trim();

// Auth schemas
export const loginSchema = z.object({
  householdId: householdIdSchema,
  passcode: z.string().min(1).max(100)
});

export const logoutSchema = z.object({});

// Member schemas
export const addMemberSchema = z.object({
  role: z.enum(['caretaker', 'family']),
  displayName: z.string().min(1).max(100).trim(),
  passcode: z.string().min(8).max(100),
  email: z.string().email().max(254).optional().nullable(),
  visibility: z.object({
    medications: z.boolean().default(true),
    appointments: z.boolean().default(true),
    adherence: z.boolean().default(true)
  }).optional()
});

export const updateMemberSchema = z.object({
  displayName: z.string().min(1).max(100).trim().optional(),
  email: z.string().email().max(254).optional().nullable(),
  visibility: z.object({
    medications: z.boolean(),
    appointments: z.boolean(),
    adherence: z.boolean()
  }).optional(),
  muteSettings: z.object({
    doseReminders: z.boolean(),
    missedDoseAlerts: z.boolean(),
    appointmentReminders: z.boolean(),
    criticalOnly: z.boolean()
  }).optional()
});

export const changePasscodeSchema = z.object({
  currentPasscode: z.string().min(1).max(100),
  newPasscode: z.string().min(6).max(100).refine((val) => {
    // We don't know role here, so allow both patterns
    return /^\d{6,}$/.test(val) || val.length >= 8;
  }, 'Passcode must be 6+ digits (elder) or 8+ characters (others)')
});

// Medication schemas
export const customScheduleSchema = z.object({
  type: z.enum(['interval', 'days_of_week', 'days_of_month']),
  intervalDays: z.number().int().min(1).max(365).nullable(),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).nullable(),
  daysOfMonth: z.array(z.number().int().min(1).max(31)).nullable()
}).refine((data) => {
  if (data.type === 'interval') return data.intervalDays !== null;
  if (data.type === 'days_of_week') return data.daysOfWeek !== null && data.daysOfWeek.length > 0;
  if (data.type === 'days_of_month') return data.daysOfMonth !== null && data.daysOfMonth.length > 0;
  return false;
}, { message: 'Invalid custom schedule configuration', path: ['type'] });

const medicationFieldsSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  genericName: z.string().max(100).trim().optional().nullable(),
  dosage: z.string().min(1).max(50).trim(),
  unit: z.string().min(1).max(20).trim(),
  instructions: z.string().max(500).trim().optional().nullable(),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'as_needed', 'custom']),
  customSchedule: customScheduleSchema.optional().nullable(),
  startDate: dateStringSchema,
  endDate: dateStringSchema.optional().nullable(),
  times: z.array(timeStringSchema).min(1, 'At least one time required').max(24),
  stockRemaining: z.number().int().min(0).optional().nullable(),
  refillThresholdDays: z.number().int().min(1).max(90).default(7),
  notes: z.string().max(1000).trim().optional().nullable()
});

export const createMedicationSchema = medicationFieldsSchema
  .refine((data) => {
    if (data.frequency === 'custom') return data.customSchedule != null;
    return true;
  }, { message: 'Custom schedule required for custom frequency', path: ['customSchedule'] })
  .refine((data) => {
    if (data.endDate) return data.startDate <= data.endDate;
    return true;
  }, { message: 'End date must be after start date', path: ['endDate'] });

export const updateMedicationSchema = medicationFieldsSchema.partial().extend({
  id: medicationIdSchema
});

export const doseActionSchema = z.object({
  status: z.enum(['taken', 'skipped']),
  takenBy: memberIdSchema.optional(),
  note: z.string().max(500).trim().optional().nullable()
});

// Appointment schemas
export const createAppointmentSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  description: z.string().max(1000).trim().optional().nullable(),
  provider: z.string().max(200).trim().optional().nullable(),
  location: z.string().max(200).trim().optional().nullable(),
  scheduledAt: isoDateTimeSchema,
  durationMinutes: z.number().int().min(1).max(480).optional().nullable()
});

export const updateAppointmentSchema = createAppointmentSchema.partial().extend({
  id: appointmentIdSchema,
  status: z.enum(['scheduled', 'completed', 'cancelled', 'rescheduled']).optional()
});

// Pending changes schemas
export const decideChangeSchema = z.object({
  decision: z.enum(['approve', 'reject']),
  note: z.string().max(500).trim().optional().nullable()
});

// Visibility schemas
export const visibilitySchema = z.object({
  medications: z.boolean(),
  appointments: z.boolean(),
  adherence: z.boolean()
});

export const updateVisibilitySchema = z.object({
  memberId: memberIdSchema,
  visibility: visibilitySchema
});

// Consent schemas
export const consentSchema = z.object({
  type: z.enum(['data_processing', 'ai_photo_processing', 'email_reminders']),
  granted: z.boolean()
});

export const bulkConsentSchema = z.object({
  consents: z.array(consentSchema).min(1)
});

// AI schemas
export const prescriptionScanSchema = z.object({
  imageBase64: z.string().min(1, 'Image required'),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
});

export const explainMedicineSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  genericName: z.string().max(100).trim().optional().nullable(),
  dosage: z.string().max(50).trim().optional().nullable()
});

export const interactionCheckSchema = z.object({
  medications: z.array(z.object({
    name: z.string().min(1).max(100).trim(),
    genericName: z.string().max(100).trim().optional().nullable(),
    dosage: z.string().max(50).trim().optional().nullable()
  })).min(2).max(20)
});

// Cron schemas
export const cronRemindersSchema = z.object({
  timestamp: z.string().datetime({ offset: true }),
  trigger: z.enum(['scheduled', 'manual']).default('scheduled')
});

// Export schemas
export const exportDataSchema = z.object({
  format: z.enum(['json', 'fhir']).default('json')
});

// Notification management schemas
export const manageNotificationsSchema = z.object({
  token: z.string().min(1),
  action: z.enum(['unsubscribe', 'preferences']),
  preferences: z.object({
    doseReminders: z.boolean().optional(),
    missedDoseAlerts: z.boolean().optional(),
    appointmentReminders: z.boolean().optional(),
    weeklySummary: z.boolean().optional(),
    refillAlerts: z.boolean().optional(),
    criticalOnly: z.boolean().optional()
  }).optional()
});

// Health check schema
export const healthSchema = z.object({});

// Type inference helpers
export type CreateHouseholdInput = z.infer<typeof createHouseholdSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type AddMemberInput = z.infer<typeof addMemberSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
export type ChangePasscodeInput = z.infer<typeof changePasscodeSchema>;
export type CreateMedicationInput = z.infer<typeof createMedicationSchema>;
export type UpdateMedicationInput = z.infer<typeof updateMedicationSchema>;
export type DoseActionInput = z.infer<typeof doseActionSchema>;
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;
export type DecideChangeInput = z.infer<typeof decideChangeSchema>;
export type VisibilityInput = z.infer<typeof visibilitySchema>;
export type UpdateVisibilityInput = z.infer<typeof updateVisibilitySchema>;
export type ConsentInput = z.infer<typeof consentSchema>;
export type BulkConsentInput = z.infer<typeof bulkConsentSchema>;
export type PrescriptionScanInput = z.infer<typeof prescriptionScanSchema>;
export type ExplainMedicineInput = z.infer<typeof explainMedicineSchema>;
export type InteractionCheckInput = z.infer<typeof interactionCheckSchema>;
export type CronRemindersInput = z.infer<typeof cronRemindersSchema>;
export type ExportDataInput = z.infer<typeof exportDataSchema>;
export type ManageNotificationsInput = z.infer<typeof manageNotificationsSchema>;