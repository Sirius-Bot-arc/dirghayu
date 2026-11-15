/**
 * Database abstraction layer
 * Repository interface with Firestore and In-Memory implementations
 * Business logic never touches Firestore directly
 */

import { 
  Household, Member, Medication, DoseRecord, Appointment, 
  PendingChange, ActivityLogEntry, ConsentRecord,
  HouseholdId, MemberId, MedicationId, AppointmentId, ChangeId, ActivityId, ConsentId,
  Role, Frequency, DoseStatus, AppointmentStatus, ChangeType, ChangeStatus, VisibilitySettings, MuteSettings
} from '@/types';

/** Repository interface - all implementations must satisfy this */
export interface IRepository {
  // Household
  createHousehold(data: Omit<Household, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<Household>;
  getHousehold(id: HouseholdId): Promise<Household | null>;
  updateHousehold(id: HouseholdId, data: Partial<Household>): Promise<Household | null>;
  deleteHousehold(id: HouseholdId): Promise<boolean>;
  
  // Members
  createMember(data: Omit<Member, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'lastLoginAt' | 'loginAttempts' | 'lockedUntil'>): Promise<Member>;
  getMember(id: MemberId): Promise<Member | null>;
  getMembersByHousehold(householdId: HouseholdId): Promise<Member[]>;
  getMemberByEmail(householdId: HouseholdId, email: string): Promise<Member | null>;
  updateMember(id: MemberId, data: Partial<Member>): Promise<Member | null>;
  deleteMember(id: MemberId): Promise<boolean>;
  
  // Medications
  createMedication(data: Omit<Medication, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<Medication>;
  getMedication(id: MedicationId): Promise<Medication | null>;
  getMedicationsByHousehold(householdId: HouseholdId, includeDeleted?: boolean): Promise<Medication[]>;
  updateMedication(id: MedicationId, data: Partial<Medication>): Promise<Medication | null>;
  deleteMedication(id: MedicationId): Promise<boolean>;
  
  // Doses
  createDose(data: Omit<DoseRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<DoseRecord>;
  getDose(id: string): Promise<DoseRecord | null>;
  getDosesByMedication(medicationId: MedicationId, startDate?: Date, endDate?: Date): Promise<DoseRecord[]>;
  getDosesByHousehold(householdId: HouseholdId, startDate?: Date, endDate?: Date): Promise<DoseRecord[]>;
  updateDose(id: string, data: Partial<DoseRecord>): Promise<DoseRecord | null>;
  
  // Appointments
  createAppointment(data: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<Appointment>;
  getAppointment(id: AppointmentId): Promise<Appointment | null>;
  getAppointmentsByHousehold(householdId: HouseholdId, includeDeleted?: boolean): Promise<Appointment[]>;
  updateAppointment(id: AppointmentId, data: Partial<Appointment>): Promise<Appointment | null>;
  deleteAppointment(id: AppointmentId): Promise<boolean>;
  
  // Pending Changes
  createChange(data: Omit<PendingChange, 'id' | 'createdAt' | 'updatedAt'>): Promise<PendingChange>;
  getChange(id: ChangeId): Promise<PendingChange | null>;
  getChangesByHousehold(householdId: HouseholdId, status?: ChangeStatus): Promise<PendingChange[]>;
  updateChange(id: ChangeId, data: Partial<PendingChange>): Promise<PendingChange | null>;
  
  // Activity Log (append-only)
  createActivityLog(data: Omit<ActivityLogEntry, 'id' | 'createdAt'>): Promise<ActivityLogEntry>;
  getActivityLog(householdId: HouseholdId, limit?: number, cursor?: string): Promise<{ entries: ActivityLogEntry[]; nextCursor: string | null }>;
  
  // Consents
  createConsent(data: Omit<ConsentRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<ConsentRecord>;
  getConsent(householdId: HouseholdId, memberId: MemberId, type: string): Promise<ConsentRecord | null>;
  getConsentsByHousehold(householdId: HouseholdId): Promise<ConsentRecord[]>;
  updateConsent(id: ConsentId, data: Partial<ConsentRecord>): Promise<ConsentRecord | null>;
  
  // Reminder deduplication
  checkAndSetReminderSent(key: string): Promise<boolean>;
  
  // Batch operations for efficiency
  batchWrite(operations: Array<{ type: 'create' | 'update' | 'delete'; collection: string; id?: string; data?: unknown }>): Promise<void>;
}

/** Collection names for Firestore */
export const COLLECTIONS = {
  HOUSEHOLDS: 'households',
  MEMBERS: 'members',
  MEDICATIONS: 'medications',
  DOSES: 'doses',
  APPOINTMENTS: 'appointments',
  CHANGES: 'changes',
  ACTIVITY_LOG: 'activityLog',
  CONSENTS: 'consents',
  REMINDER_DEDUPE: 'reminderDedupe'
} as const;

/** Convert Firestore Timestamp to Date */
export function timestampToDate(ts: { toDate: () => Date } | Date | null | undefined): Date | null {
  if (!ts) return null;
  if (ts instanceof Date) return ts;
  if (typeof ts === 'object' && 'toDate' in ts) return ts.toDate();
  return null;
}

/** Convert Date to Firestore Timestamp */
export function dateToTimestamp(date: Date | null | undefined): { toDate: () => Date } | null {
  if (!date) return null;
  return {
    toDate: () => date
  };
}

/** Generate a unique ID */
export function generateId(prefix: string = ''): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).substring(2, 10)}`;
}