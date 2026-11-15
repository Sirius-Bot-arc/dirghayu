/**
 * In-memory repository implementation
 * Used for local development and testing when FIRESTORE_ENABLED=false
 */

import { IRepository, COLLECTIONS, generateId, timestampToDate, dateToTimestamp } from '@/lib/db';
import { 
  Household, Member, Medication, DoseRecord, Appointment, 
  PendingChange, ActivityLogEntry, ConsentRecord,
  HouseholdId, MemberId, MedicationId, AppointmentId, ChangeId, ActivityId, ConsentId,
  Role, Frequency, DoseStatus, AppointmentStatus, ChangeType, ChangeStatus, VisibilitySettings, MuteSettings
} from '@/types';

// In-memory storage
const stores = {
  households: new Map<HouseholdId, Household>(),
  members: new Map<MemberId, Member>(),
  medications: new Map<MedicationId, Medication>(),
  doses: new Map<string, DoseRecord>(),
  appointments: new Map<AppointmentId, Appointment>(),
  changes: new Map<ChangeId, PendingChange>(),
  activityLog: new Map<ActivityId, ActivityLogEntry>(),
  consents: new Map<string, ConsentRecord>(), // key: `${householdId}:${memberId}:${type}`
  reminderDedupe: new Map<string, boolean>()
};

// Helper to get current timestamp
const now = () => new Date();

export class InMemoryRepository implements IRepository {
  // Household
  async createHousehold(data: Omit<Household, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<Household> {
    const id = generateId('hh_') as HouseholdId;
    const household: Household = {
      ...data,
      id,
      createdAt: now(),
      updatedAt: now(),
      deletedAt: null
    };
    stores.households.set(id, household);
    return household;
  }

  async getHousehold(id: HouseholdId): Promise<Household | null> {
    const household = stores.households.get(id);
    return household?.deletedAt ? null : household ?? null;
  }

  async updateHousehold(id: HouseholdId, data: Partial<Household>): Promise<Household | null> {
    const household = stores.households.get(id);
    if (!household || household.deletedAt) return null;
    const updated = { ...household, ...data, updatedAt: now() };
    stores.households.set(id, updated);
    return updated;
  }

  async deleteHousehold(id: HouseholdId): Promise<boolean> {
    const household = stores.households.get(id);
    if (!household) return false;
    household.deletedAt = now();
    household.updatedAt = now();
    stores.households.set(id, household);
    return true;
  }

  // Members
  async createMember(data: Omit<Member, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'lastLoginAt' | 'loginAttempts' | 'lockedUntil'>): Promise<Member> {
    const id = generateId('mem_') as MemberId;
    const member: Member = {
      ...data,
      id,
      createdAt: now(),
      updatedAt: now(),
      deletedAt: null,
      lastLoginAt: null,
      loginAttempts: 0,
      lockedUntil: null
    };
    stores.members.set(id, member);
    return member;
  }

  async getMember(id: MemberId): Promise<Member | null> {
    const member = stores.members.get(id);
    return member?.deletedAt ? null : member ?? null;
  }

  async getMembersByHousehold(householdId: HouseholdId): Promise<Member[]> {
    const members: Member[] = [];
    for (const member of stores.members.values()) {
      if (member.householdId === householdId && !member.deletedAt) {
        members.push(member);
      }
    }
    return members.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async getMemberByEmail(householdId: HouseholdId, email: string): Promise<Member | null> {
    for (const member of stores.members.values()) {
      if (member.householdId === householdId && member.email === email && !member.deletedAt) {
        return member;
      }
    }
    return null;
  }

  async updateMember(id: MemberId, data: Partial<Member>): Promise<Member | null> {
    const member = stores.members.get(id);
    if (!member || member.deletedAt) return null;
    const updated = { ...member, ...data, updatedAt: now() };
    stores.members.set(id, updated);
    return updated;
  }

  async deleteMember(id: MemberId): Promise<boolean> {
    const member = stores.members.get(id);
    if (!member) return false;
    member.deletedAt = now();
    member.updatedAt = now();
    stores.members.set(id, member);
    return true;
  }

  // Medications
  async createMedication(data: Omit<Medication, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<Medication> {
    const id = generateId('med_') as MedicationId;
    const medication: Medication = {
      ...data,
      id,
      createdAt: now(),
      updatedAt: now(),
      deletedAt: null
    };
    stores.medications.set(id, medication);
    return medication;
  }

  async getMedication(id: MedicationId): Promise<Medication | null> {
    const medication = stores.medications.get(id);
    return medication?.deletedAt ? null : medication ?? null;
  }

  async getMedicationsByHousehold(householdId: HouseholdId, includeDeleted = false): Promise<Medication[]> {
    const medications: Medication[] = [];
    for (const med of stores.medications.values()) {
      if (med.householdId === householdId && (includeDeleted || !med.deletedAt)) {
        medications.push(med);
      }
    }
    return medications.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async updateMedication(id: MedicationId, data: Partial<Medication>): Promise<Medication | null> {
    const medication = stores.medications.get(id);
    if (!medication || medication.deletedAt) return null;
    const updated = { ...medication, ...data, updatedAt: now() };
    stores.medications.set(id, updated);
    return updated;
  }

  async deleteMedication(id: MedicationId): Promise<boolean> {
    const medication = stores.medications.get(id);
    if (!medication) return false;
    medication.deletedAt = now();
    medication.updatedAt = now();
    stores.medications.set(id, medication);
    return true;
  }

  // Doses
  async createDose(data: Omit<DoseRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<DoseRecord> {
    const id = generateId('dose_');
    const dose: DoseRecord = {
      ...data,
      id,
      createdAt: now(),
      updatedAt: now()
    };
    stores.doses.set(id, dose);
    return dose;
  }

  async getDose(id: string): Promise<DoseRecord | null> {
    return stores.doses.get(id) ?? null;
  }

  async getDosesByMedication(medicationId: MedicationId, startDate?: Date, endDate?: Date): Promise<DoseRecord[]> {
    const doses: DoseRecord[] = [];
    for (const dose of stores.doses.values()) {
      if (dose.medicationId === medicationId) {
        if (startDate && dose.scheduledAt < startDate) continue;
        if (endDate && dose.scheduledAt > endDate) continue;
        doses.push(dose);
      }
    }
    return doses.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
  }

  async getDosesByHousehold(householdId: HouseholdId, startDate?: Date, endDate?: Date): Promise<DoseRecord[]> {
    // Need to join with medications to filter by household
    const medIds = new Set<string>();
    for (const med of stores.medications.values()) {
      if (med.householdId === householdId) medIds.add(med.id);
    }
    
    const doses: DoseRecord[] = [];
    for (const dose of stores.doses.values()) {
      if (medIds.has(dose.medicationId)) {
        if (startDate && dose.scheduledAt < startDate) continue;
        if (endDate && dose.scheduledAt > endDate) continue;
        doses.push(dose);
      }
    }
    return doses.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
  }

  async updateDose(id: string, data: Partial<DoseRecord>): Promise<DoseRecord | null> {
    const dose = stores.doses.get(id);
    if (!dose) return null;
    const updated = { ...dose, ...data, updatedAt: now() };
    stores.doses.set(id, updated);
    return updated;
  }

  // Appointments
  async createAppointment(data: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<Appointment> {
    const id = generateId('apt_') as AppointmentId;
    const appointment: Appointment = {
      ...data,
      id,
      createdAt: now(),
      updatedAt: now(),
      deletedAt: null
    };
    stores.appointments.set(id, appointment);
    return appointment;
  }

  async getAppointment(id: AppointmentId): Promise<Appointment | null> {
    const appointment = stores.appointments.get(id);
    return appointment?.deletedAt ? null : appointment ?? null;
  }

  async getAppointmentsByHousehold(householdId: HouseholdId, includeDeleted = false): Promise<Appointment[]> {
    const appointments: Appointment[] = [];
    for (const apt of stores.appointments.values()) {
      if (apt.householdId === householdId && (includeDeleted || !apt.deletedAt)) {
        appointments.push(apt);
      }
    }
    return appointments.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
  }

  async updateAppointment(id: AppointmentId, data: Partial<Appointment>): Promise<Appointment | null> {
    const appointment = stores.appointments.get(id);
    if (!appointment || appointment.deletedAt) return null;
    const updated = { ...appointment, ...data, updatedAt: now() };
    stores.appointments.set(id, updated);
    return updated;
  }

  async deleteAppointment(id: AppointmentId): Promise<boolean> {
    const appointment = stores.appointments.get(id);
    if (!appointment) return false;
    appointment.deletedAt = now();
    appointment.updatedAt = now();
    stores.appointments.set(id, appointment);
    return true;
  }

  // Pending Changes
  async createChange(data: Omit<PendingChange, 'id' | 'createdAt' | 'updatedAt'>): Promise<PendingChange> {
    const id = generateId('chg_') as ChangeId;
    const change: PendingChange = {
      ...data,
      id,
      createdAt: now(),
      updatedAt: now()
    };
    stores.changes.set(id, change);
    return change;
  }

  async getChange(id: ChangeId): Promise<PendingChange | null> {
    return stores.changes.get(id) ?? null;
  }

  async getChangesByHousehold(householdId: HouseholdId, status?: ChangeStatus): Promise<PendingChange[]> {
    const changes: PendingChange[] = [];
    for (const change of stores.changes.values()) {
      // Need to check household via resource - for simplicity, store householdId in change
      // This is a limitation of in-memory; in Firestore we'd query by householdId field
      if (status && change.status !== status) continue;
      changes.push(change);
    }
    return changes.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async updateChange(id: ChangeId, data: Partial<PendingChange>): Promise<PendingChange | null> {
    const change = stores.changes.get(id);
    if (!change) return null;
    const updated = { ...change, ...data, updatedAt: now() };
    stores.changes.set(id, updated);
    return updated;
  }

  // Activity Log (append-only)
  async createActivityLog(data: Omit<ActivityLogEntry, 'id' | 'createdAt'>): Promise<ActivityLogEntry> {
    const id = generateId('act_') as ActivityId;
    const entry: ActivityLogEntry = {
      ...data,
      id,
      createdAt: now()
    };
    stores.activityLog.set(id, entry);
    return entry;
  }

  async getActivityLog(householdId: HouseholdId, limit = 50, cursor?: string): Promise<{ entries: ActivityLogEntry[]; nextCursor: string | null }> {
    const entries: ActivityLogEntry[] = [];
    for (const entry of stores.activityLog.values()) {
      if (entry.householdId === householdId) {
        entries.push(entry);
      }
    }
    entries.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()); // Newest first
    
    let startIndex = 0;
    if (cursor) {
      startIndex = entries.findIndex(e => e.id === cursor);
      if (startIndex >= 0) startIndex += 1;
    }
    
    const page = entries.slice(startIndex, startIndex + limit);
    const nextCursor = page.length === limit && startIndex + limit < entries.length 
      ? page[page.length - 1].id 
      : null;
    
    return { entries: page, nextCursor };
  }

  // Consents
  async createConsent(data: Omit<ConsentRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<ConsentRecord> {
    const id = generateId('cst_') as ConsentId;
    const key = `${data.householdId}:${data.memberId}:${data.type}`;
    const consent: ConsentRecord = {
      ...data,
      id,
      createdAt: now(),
      updatedAt: now()
    };
    stores.consents.set(key, consent);
    return consent;
  }

  async getConsent(householdId: HouseholdId, memberId: MemberId, type: string): Promise<ConsentRecord | null> {
    const key = `${householdId}:${memberId}:${type}`;
    return stores.consents.get(key) ?? null;
  }

  async getConsentsByHousehold(householdId: HouseholdId): Promise<ConsentRecord[]> {
    const consents: ConsentRecord[] = [];
    for (const [key, consent] of stores.consents.entries()) {
      if (key.startsWith(`${householdId}:`)) {
        consents.push(consent);
      }
    }
    return consents;
  }

  async updateConsent(id: ConsentId, data: Partial<ConsentRecord>): Promise<ConsentRecord | null> {
    // Find by id
    for (const [key, consent] of stores.consents.entries()) {
      if (consent.id === id) {
        const updated = { ...consent, ...data, updatedAt: now() };
        stores.consents.set(key, updated);
        return updated;
      }
    }
    return null;
  }

  // Reminder deduplication
  async checkAndSetReminderSent(key: string): Promise<boolean> {
    if (stores.reminderDedupe.has(key)) {
      return false; // Already sent
    }
    stores.reminderDedupe.set(key, true);
    return true; // First time, can send
  }

  // Batch operations
  async batchWrite(operations: Array<{ type: 'create' | 'update' | 'delete'; collection: string; id?: string; data?: unknown }>): Promise<void> {
    for (const op of operations) {
      switch (op.type) {
        case 'create':
          // Handled by individual create methods
          break;
        case 'update':
          if (op.id && op.data) {
            switch (op.collection) {
              case COLLECTIONS.HOUSEHOLDS:
                await this.updateHousehold(op.id as HouseholdId, op.data as Partial<Household>);
                break;
              case COLLECTIONS.MEMBERS:
                await this.updateMember(op.id as MemberId, op.data as Partial<Member>);
                break;
              case COLLECTIONS.MEDICATIONS:
                await this.updateMedication(op.id as MedicationId, op.data as Partial<Medication>);
                break;
              case COLLECTIONS.DOSES:
                await this.updateDose(op.id, op.data as Partial<DoseRecord>);
                break;
              case COLLECTIONS.APPOINTMENTS:
                await this.updateAppointment(op.id as AppointmentId, op.data as Partial<Appointment>);
                break;
              case COLLECTIONS.CHANGES:
                await this.updateChange(op.id as ChangeId, op.data as Partial<PendingChange>);
                break;
              case COLLECTIONS.CONSENTS:
                await this.updateConsent(op.id as ConsentId, op.data as Partial<ConsentRecord>);
                break;
            }
          }
          break;
        case 'delete':
          if (op.id) {
            switch (op.collection) {
              case COLLECTIONS.HOUSEHOLDS:
                await this.deleteHousehold(op.id as HouseholdId);
                break;
              case COLLECTIONS.MEMBERS:
                await this.deleteMember(op.id as MemberId);
                break;
              case COLLECTIONS.MEDICATIONS:
                await this.deleteMedication(op.id as MedicationId);
                break;
              case COLLECTIONS.APPOINTMENTS:
                await this.deleteAppointment(op.id as AppointmentId);
                break;
            }
          }
          break;
      }
    }
  }

  /** Clear all data (for testing) */
  static clear(): void {
    stores.households.clear();
    stores.members.clear();
    stores.medications.clear();
    stores.doses.clear();
    stores.appointments.clear();
    stores.changes.clear();
    stores.activityLog.clear();
    stores.consents.clear();
    stores.reminderDedupe.clear();
  }
}