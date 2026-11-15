/**
 * Core type definitions for Dirghayu
 * All domain types live here to ensure consistency across the codebase
 */

import { Timestamp } from 'firebase-admin/firestore';

/** Unique identifier for households */
export type HouseholdId = string & { readonly __brand: unique symbol };

/** Unique identifier for members within a household */
export type MemberId = string & { readonly __brand: unique symbol };

/** Unique identifier for medications */
export type MedicationId = string & { readonly __brand: unique symbol };

/** Unique identifier for appointments */
export type AppointmentId = string & { readonly __brand: unique symbol };

/** Unique identifier for pending changes */
export type ChangeId = string & { readonly __brand: unique symbol };

/** Unique identifier for activity log entries */
export type ActivityId = string & { readonly __brand: unique symbol };

/** Unique identifier for consent records */
export type ConsentId = string & { readonly __brand: unique symbol };

/** Role within a household */
export type Role = 'elder' | 'caretaker' | 'family';

/** Medication schedule frequency */
export type Frequency = 'daily' | 'weekly' | 'monthly' | 'as_needed' | 'custom';

/** Medication dose status */
export type DoseStatus = 'pending' | 'taken' | 'missed' | 'skipped';

/** Appointment status */
export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';

/** Pending change status */
export type ChangeStatus = 'pending' | 'approved' | 'rejected' | 'expired';

/** Change type for pending modifications */
export type ChangeType = 'medication_create' | 'medication_update' | 'medication_delete' | 'appointment_create' | 'appointment_update' | 'appointment_delete';

/** Visibility settings per member */
export interface VisibilitySettings {
  medications: boolean;
  appointments: boolean;
  adherence: boolean;
}

/** Consent types */
export type ConsentType = 'data_processing' | 'ai_photo_processing' | 'email_reminders';

/** Consent record */
export interface ConsentRecord {
  id: ConsentId;
  householdId: HouseholdId;
  memberId: MemberId;
  type: ConsentType;
  version: number;
  granted: boolean;
  grantedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Household entity */
export interface Household {
  id: HouseholdId;
  name: string;
  timezone: string;
  createdBy: MemberId;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

/** Member entity */
export interface Member {
  id: MemberId;
  householdId: HouseholdId;
  role: Role;
  displayName: string;
  passcodeHash: string;
  passcodeSalt: string;
  email: string | null;
  emailVerified: boolean;
  muteSettings: MuteSettings;
  visibility: VisibilitySettings;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  lastLoginAt: Date | null;
  loginAttempts: number;
  lockedUntil: Date | null;
}

/** Mute settings for notifications */
export interface MuteSettings {
  doseReminders: boolean;
  missedDoseAlerts: boolean;
  appointmentReminders: boolean;
  criticalOnly: boolean;
}

/** Medication entity */
export interface Medication {
  id: MedicationId;
  householdId: HouseholdId;
  name: string;
  genericName: string | null;
  dosage: string;
  unit: string;
  instructions: string | null;
  frequency: Frequency;
  customSchedule: CustomSchedule | null;
  startDate: Date;
  endDate: Date | null;
  times: string[]; // HH:mm in household timezone
  stockRemaining: number | null;
  refillThresholdDays: number;
  notes: string | null;
  createdBy: MemberId;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

/** Custom schedule for complex frequencies */
export interface CustomSchedule {
  type: 'interval' | 'days_of_week' | 'days_of_month';
  intervalDays: number | null;
  daysOfWeek: number[] | null; // 0-6, Sunday=0
  daysOfMonth: number[] | null; // 1-31
}

/** Dose record (adherence tracking) */
export interface DoseRecord {
  id: string;
  householdId: HouseholdId;
  medicationId: MedicationId;
  scheduledAt: Date; // Exact scheduled time in household timezone
  takenAt: Date | null;
  status: DoseStatus;
  takenBy: MemberId | null;
  notedBy: MemberId | null;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Appointment entity */
export interface Appointment {
  id: AppointmentId;
  householdId: HouseholdId;
  title: string;
  description: string | null;
  provider: string | null;
  location: string | null;
  scheduledAt: Date; // In household timezone
  durationMinutes: number | null;
  status: AppointmentStatus;
  reminderSent: boolean;
  createdBy: MemberId;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

/** Pending change entity */
export interface PendingChange {
  id: ChangeId;
  householdId: HouseholdId;
  type: ChangeType;
  resourceId: MedicationId | AppointmentId;
  proposedData: Record<string, unknown>;
  currentData: Record<string, unknown> | null;
  requestedBy: MemberId;
  status: ChangeStatus;
  decidedBy: MemberId | null;
  decidedAt: Date | null;
  decisionNote: string | null;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

/** Activity log entry (append-only) */
export interface ActivityLogEntry {
  id: ActivityId;
  householdId: HouseholdId;
  memberId: MemberId;
  action: string;
  resourceType: 'household' | 'medication' | 'appointment' | 'dose' | 'change' | 'member' | 'consent' | 'visibility' | 'export' | 'delete' | 'ai';
  resourceId: string | null;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

/** Reminder deduplication key */
export interface ReminderDedupeKey {
  householdId: HouseholdId;
  recipientId: MemberId;
  type: 'upcoming_dose' | 'missed_dose' | 'upcoming_appointment' | 'escalation_caretaker' | 'escalation_family' | 'refill_low' | 'weekly_summary';
  referenceId: string; // medicationId, appointmentId, or doseId
  stage: number; // 0=initial, 1=escalation1, 2=escalation2
  scheduledFor: Date; // The time this reminder is for
}

/** Email template context */
export interface EmailTemplateContext {
  householdName: string;
  elderName: string;
  recipientName: string;
  medicationName?: string;
  dosage?: string;
  time?: string;
  appointmentTitle?: string;
  appointmentTime?: string;
  provider?: string;
  location?: string;
  manageUrl: string;
  unsubscribeUrl: string;
}

/** API response shapes */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

/** Session payload in JWT */
export interface SessionPayload {
  householdId: HouseholdId;
  memberId: MemberId;
  role: Role;
  iat: number;
  exp: number;
}

/** Authorization context for request handlers */
export interface AuthContext {
  householdId: HouseholdId;
  memberId: MemberId;
  role: Role;
  member: Member;
}

/** Timezone-aware date range */
export interface DateRange {
  start: Date;
  end: Date;
}

/** Adherence calculation result */
export interface AdherenceResult {
  medicationId: MedicationId;
  medicationName: string;
  period: DateRange;
  totalScheduled: number;
  totalTaken: number;
  totalMissed: number;
  totalSkipped: number;
  pdc: number; // Proportion of Days Covered (0-1)
  onTimeRate: number; // Percentage taken within window (0-1)
  averageDelayMinutes: number | null;
}

/** Weekly summary for family */
export interface WeeklySummary {
  householdId: HouseholdId;
  weekStart: Date;
  weekEnd: Date;
  elderName: string;
  medications: Array<{
    medicationId: MedicationId;
    name: string;
    scheduled: number;
    taken: number;
    missed: number;
    adherence: number;
  }>;
  appointments: Array<{
    id: AppointmentId;
    title: string;
    scheduledAt: Date;
    status: AppointmentStatus;
  }>;
  notes: string | null;
  generatedAt: Date;
}

/** Doctor Visit Summary */
export interface DoctorVisitSummary {
  householdId: HouseholdId;
  elderName: string;
  period: DateRange;
  generatedAt: Date;
  adherence: AdherenceResult[];
  missedDoses: Array<{
    medicationId: MedicationId;
    medicationName: string;
    scheduledAt: Date;
    reason: string | null;
  }>;
  elderNotes: string | null;
  pendingChanges: PendingChange[];
  medications: Medication[];
  appointments: Appointment[];
}

/** AI Prescription Scan Result */
export interface PrescriptionScanResult {
  medications: Array<{
    name: string;
    genericName: string | null;
    dosage: string;
    unit: string;
    frequency: Frequency;
    times: string[];
    instructions: string | null;
    durationDays: number | null;
  }>;
  warnings: string[];
  confidence: number;
}

/** AI Medicine Explanation */
export interface MedicineExplanation {
  name: string;
  genericName: string | null;
  purpose: string;
  howItWorks: string;
  commonSideEffects: string[];
  seriousSideEffects: string[];
  interactions: string[];
  precautions: string[];
  disclaimer: string;
}

/** AI Interaction Check Result */
export interface InteractionCheckResult {
  interactions: Array<{
    medicationA: string;
    medicationB: string;
    severity: 'minor' | 'moderate' | 'major';
    description: string;
    recommendation: string;
  }>;
  disclaimer: string;
}

/** FHIR R4 MedicationStatement */
export interface FHIRMedicationStatement {
  resourceType: 'MedicationStatement';
  id: string;
  status: 'active' | 'completed' | 'entered-in-error' | 'intended' | 'stopped' | 'on-hold' | 'unknown' | 'not-taken';
  medicationCodeableConcept: {
    coding: Array<{
      system: string;
      code: string;
      display: string;
    }>;
    text: string;
  };
  subject: {
    reference: string;
  };
  effectiveDateTime: string;
  dateAsserted: string;
  informationSource: {
    reference: string;
  }
  dosage: Array<{
    timing: {
      repeat: {
        frequency: number;
        period: number;
        periodUnit: 'h' | 'd' | 'wk' | 'mo' | 'a';
        timeOfDay: string[];
      };
    };
    doseAndRate: Array<{
      type: {
        coding: Array<{
          system: string;
          code: string;
          display: string;
        }>;
      };
      doseQuantity: {
        value: number;
        unit: string;
        system: string;
        code: string;
      };
    }>;
  }>;
}

/** Export data structure */
export interface ExportData {
  household: Household;
  members: Member[];
  medications: Medication[];
  doses: DoseRecord[];
  appointments: Appointment[];
  pendingChanges: PendingChange[];
  activityLog: ActivityLogEntry[];
  consents: ConsentRecord[];
  exportedAt: Date;
}

/** Cron job payload */
export interface CronRemindersPayload {
  timestamp: string;
  trigger: 'scheduled' | 'manual';
}