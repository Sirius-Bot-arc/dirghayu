/**
 * Firestore repository implementation
 * Used in production when FIRESTORE_ENABLED=true
 */

import { 
  getFirestore, 
  FieldValue, 
  Timestamp, 
  WriteBatch,
  Query,
  DocumentSnapshot,
  CollectionReference,
  DocumentReference
} from 'firebase-admin/firestore';
import { initializeApp, getApps, cert, applicationDefault } from 'firebase-admin/app';
import { IRepository, COLLECTIONS, generateId, timestampToDate, dateToTimestamp } from '@/lib/db';
import { 
  Household, Member, Medication, DoseRecord, Appointment, 
  PendingChange, ActivityLogEntry, ConsentRecord,
  HouseholdId, MemberId, MedicationId, AppointmentId, ChangeId, ActivityId, ConsentId,
  Role, Frequency, DoseStatus, AppointmentStatus, ChangeType, ChangeStatus, VisibilitySettings, MuteSettings
} from '@/types';
import { FIRESTORE_ENABLED, FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } from '@/lib/config';

// Initialize Firebase Admin
let db: ReturnType<typeof getFirestore> | null = null;

function getDb() {
  if (!FIRESTORE_ENABLED) {
    throw new Error('Firestore not enabled. Set FIRESTORE_ENABLED=true');
  }
  
  if (!db) {
    if (getApps().length === 0) {
      if (FIREBASE_CLIENT_EMAIL && FIREBASE_PRIVATE_KEY) {
        initializeApp({
          credential: cert({
            projectId: FIREBASE_PROJECT_ID,
            clientEmail: FIREBASE_CLIENT_EMAIL,
            privateKey: FIREBASE_PRIVATE_KEY
          }),
          projectId: FIREBASE_PROJECT_ID
        });
      } else {
        initializeApp({
          credential: applicationDefault(),
          projectId: FIREBASE_PROJECT_ID
        });
      }
    }
    db = getFirestore();
  }
  return db;
}

/** Convert Firestore document to typed object */
function docToHousehold(doc: DocumentSnapshot): Household | null {
  if (!doc.exists) return null;
  const data = doc.data()!;
  return {
    id: doc.id as HouseholdId,
    name: data.name,
    timezone: data.timezone,
    createdBy: data.createdBy as MemberId,
    createdAt: timestampToDate(data.createdAt)!,
    updatedAt: timestampToDate(data.updatedAt)!,
    deletedAt: timestampToDate(data.deletedAt)
  };
}

function docToMember(doc: DocumentSnapshot): Member | null {
  if (!doc.exists) return null;
  const data = doc.data()!;
  return {
    id: doc.id as MemberId,
    householdId: data.householdId as HouseholdId,
    role: data.role,
    displayName: data.displayName,
    passcodeHash: data.passcodeHash,
    passcodeSalt: data.passcodeSalt,
    email: data.email,
    emailVerified: data.emailVerified,
    muteSettings: data.muteSettings,
    visibility: data.visibility,
    createdAt: timestampToDate(data.createdAt)!,
    updatedAt: timestampToDate(data.updatedAt)!,
    deletedAt: timestampToDate(data.deletedAt),
    lastLoginAt: timestampToDate(data.lastLoginAt),
    loginAttempts: data.loginAttempts,
    lockedUntil: timestampToDate(data.lockedUntil)
  };
}

function docToMedication(doc: DocumentSnapshot): Medication | null {
  if (!doc.exists) return null;
  const data = doc.data()!;
  return {
    id: doc.id as MedicationId,
    householdId: data.householdId as HouseholdId,
    name: data.name,
    genericName: data.genericName,
    dosage: data.dosage,
    unit: data.unit,
    instructions: data.instructions,
    frequency: data.frequency,
    customSchedule: data.customSchedule,
    startDate: timestampToDate(data.startDate)!,
    endDate: timestampToDate(data.endDate),
    times: data.times,
    stockRemaining: data.stockRemaining,
    refillThresholdDays: data.refillThresholdDays,
    notes: data.notes,
    createdBy: data.createdBy as MemberId,
    createdAt: timestampToDate(data.createdAt)!,
    updatedAt: timestampToDate(data.updatedAt)!,
    deletedAt: timestampToDate(data.deletedAt)
  };
}

function docToDose(doc: DocumentSnapshot): DoseRecord | null {
  if (!doc.exists) return null;
  const data = doc.data()!;
  return {
    id: doc.id,
    householdId: data.householdId as HouseholdId,
    medicationId: data.medicationId as MedicationId,
    scheduledAt: timestampToDate(data.scheduledAt)!,
    takenAt: timestampToDate(data.takenAt),
    status: data.status,
    takenBy: data.takenBy as MemberId | null,
    notedBy: data.notedBy as MemberId | null,
    note: data.note,
    createdAt: timestampToDate(data.createdAt)!,
    updatedAt: timestampToDate(data.updatedAt)!
  };
}

function docToAppointment(doc: DocumentSnapshot): Appointment | null {
  if (!doc.exists) return null;
  const data = doc.data()!;
  return {
    id: doc.id as AppointmentId,
    householdId: data.householdId as HouseholdId,
    title: data.title,
    description: data.description,
    provider: data.provider,
    location: data.location,
    scheduledAt: timestampToDate(data.scheduledAt)!,
    durationMinutes: data.durationMinutes,
    status: data.status,
    reminderSent: data.reminderSent,
    createdBy: data.createdBy as MemberId,
    createdAt: timestampToDate(data.createdAt)!,
    updatedAt: timestampToDate(data.updatedAt)!,
    deletedAt: timestampToDate(data.deletedAt)
  };
}

function docToChange(doc: DocumentSnapshot): PendingChange | null {
  if (!doc.exists) return null;
  const data = doc.data()!;
  return {
    id: doc.id as ChangeId,
    householdId: data.householdId as HouseholdId,
    type: data.type,
    resourceId: data.resourceId as MedicationId | AppointmentId,
    proposedData: data.proposedData,
    currentData: data.currentData,
    requestedBy: data.requestedBy as MemberId,
    status: data.status,
    decidedBy: data.decidedBy as MemberId | null,
    decidedAt: timestampToDate(data.decidedAt),
    decisionNote: data.decisionNote,
    expiresAt: timestampToDate(data.expiresAt)!,
    createdAt: timestampToDate(data.createdAt)!,
    updatedAt: timestampToDate(data.updatedAt)!
  };
}

function docToActivity(doc: DocumentSnapshot): ActivityLogEntry | null {
  if (!doc.exists) return null;
  const data = doc.data()!;
  return {
    id: doc.id as ActivityId,
    householdId: data.householdId as HouseholdId,
    memberId: data.memberId as MemberId,
    action: data.action,
    resourceType: data.resourceType,
    resourceId: data.resourceId,
    metadata: data.metadata,
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
    createdAt: timestampToDate(data.createdAt)!
  };
}

function docToConsent(doc: DocumentSnapshot): ConsentRecord | null {
  if (!doc.exists) return null;
  const data = doc.data()!;
  return {
    id: doc.id as ConsentId,
    householdId: data.householdId as HouseholdId,
    memberId: data.memberId as MemberId,
    type: data.type,
    version: data.version,
    granted: data.granted,
    grantedAt: timestampToDate(data.grantedAt),
    revokedAt: timestampToDate(data.revokedAt),
    createdAt: timestampToDate(data.createdAt)!,
    updatedAt: timestampToDate(data.updatedAt)!
  };
}

export class FirestoreRepository implements IRepository {
  private db = getDb();

  // Household
  async createHousehold(data: Omit<Household, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<Household> {
    const id = generateId('hh_') as HouseholdId;
    const now = Timestamp.now();
    const household = {
      ...data,
      createdAt: now,
      updatedAt: now,
      deletedAt: null
    };
    await this.db.collection(COLLECTIONS.HOUSEHOLDS).doc(id).set(household);
    return { ...data, id, createdAt: now.toDate(), updatedAt: now.toDate(), deletedAt: null };
  }

  async getHousehold(id: HouseholdId): Promise<Household | null> {
    const doc = await this.db.collection(COLLECTIONS.HOUSEHOLDS).doc(id).get();
    const household = docToHousehold(doc);
    return household?.deletedAt ? null : household;
  }

  async updateHousehold(id: HouseholdId, data: Partial<Household>): Promise<Household | null> {
    const ref = this.db.collection(COLLECTIONS.HOUSEHOLDS).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return null;
    const existing = docToHousehold(doc);
    if (existing?.deletedAt) return null;
    
    const updateData = { ...data, updatedAt: Timestamp.now() };
    await ref.update(updateData);
    return this.getHousehold(id);
  }

  async deleteHousehold(id: HouseholdId): Promise<boolean> {
    const ref = this.db.collection(COLLECTIONS.HOUSEHOLDS).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return false;
    await ref.update({ deletedAt: Timestamp.now(), updatedAt: Timestamp.now() });
    return true;
  }

  // Members
  async createMember(data: Omit<Member, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'lastLoginAt' | 'loginAttempts' | 'lockedUntil'>): Promise<Member> {
    const id = generateId('mem_') as MemberId;
    const now = Timestamp.now();
    const member = {
      ...data,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      lastLoginAt: null,
      loginAttempts: 0,
      lockedUntil: null
    };
    await this.db.collection(COLLECTIONS.MEMBERS).doc(id).set(member);
    return { ...data, id, createdAt: now.toDate(), updatedAt: now.toDate(), deletedAt: null, lastLoginAt: null, loginAttempts: 0, lockedUntil: null };
  }

  async getMember(id: MemberId): Promise<Member | null> {
    const doc = await this.db.collection(COLLECTIONS.MEMBERS).doc(id).get();
    const member = docToMember(doc);
    return member?.deletedAt ? null : member;
  }

  async getMembersByHousehold(householdId: HouseholdId): Promise<Member[]> {
    const snapshot = await this.db.collection(COLLECTIONS.MEMBERS)
      .where('householdId', '==', householdId)
      .where('deletedAt', '==', null)
      .orderBy('createdAt')
      .get();
    return snapshot.docs.map(docToMember).filter((m): m is Member => m !== null);
  }

  async getMemberByEmail(householdId: HouseholdId, email: string): Promise<Member | null> {
    const snapshot = await this.db.collection(COLLECTIONS.MEMBERS)
      .where('householdId', '==', householdId)
      .where('email', '==', email)
      .where('deletedAt', '==', null)
      .limit(1)
      .get();
    if (snapshot.empty) return null;
    return docToMember(snapshot.docs[0]);
  }

  async updateMember(id: MemberId, data: Partial<Member>): Promise<Member | null> {
    const ref = this.db.collection(COLLECTIONS.MEMBERS).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return null;
    const existing = docToMember(doc);
    if (existing?.deletedAt) return null;
    
    await ref.update({ ...data, updatedAt: Timestamp.now() });
    return this.getMember(id);
  }

  async deleteMember(id: MemberId): Promise<boolean> {
    const ref = this.db.collection(COLLECTIONS.MEMBERS).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return false;
    await ref.update({ deletedAt: Timestamp.now(), updatedAt: Timestamp.now() });
    return true;
  }

  // Medications
  async createMedication(data: Omit<Medication, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<Medication> {
    const id = generateId('med_') as MedicationId;
    const now = Timestamp.now();
    const medication = {
      ...data,
      startDate: Timestamp.fromDate(data.startDate),
      endDate: data.endDate ? Timestamp.fromDate(data.endDate) : null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null
    };
    await this.db.collection(COLLECTIONS.MEDICATIONS).doc(id).set(medication);
    return { ...data, id, createdAt: now.toDate(), updatedAt: now.toDate(), deletedAt: null };
  }

  async getMedication(id: MedicationId): Promise<Medication | null> {
    const doc = await this.db.collection(COLLECTIONS.MEDICATIONS).doc(id).get();
    const med = docToMedication(doc);
    return med?.deletedAt ? null : med;
  }

  async getMedicationsByHousehold(householdId: HouseholdId, includeDeleted = false): Promise<Medication[]> {
    let query: Query = this.db.collection(COLLECTIONS.MEDICATIONS)
      .where('householdId', '==', householdId)
      .orderBy('createdAt');
    
    if (!includeDeleted) {
      query = query.where('deletedAt', '==', null);
    }
    
    const snapshot = await query.get();
    return snapshot.docs.map(docToMedication).filter((m): m is Medication => m !== null);
  }

  async updateMedication(id: MedicationId, data: Partial<Medication>): Promise<Medication | null> {
    const ref = this.db.collection(COLLECTIONS.MEDICATIONS).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return null;
    const existing = docToMedication(doc);
    if (existing?.deletedAt) return null;
    
    const updateData: Record<string, unknown> = { ...data, updatedAt: Timestamp.now() };
    if (data.startDate) updateData.startDate = Timestamp.fromDate(data.startDate);
    if (data.endDate) updateData.endDate = Timestamp.fromDate(data.endDate);
    if (data.endDate === null) updateData.endDate = null;
    
    await ref.update(updateData);
    return this.getMedication(id);
  }

  async deleteMedication(id: MedicationId): Promise<boolean> {
    const ref = this.db.collection(COLLECTIONS.MEDICATIONS).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return false;
    await ref.update({ deletedAt: Timestamp.now(), updatedAt: Timestamp.now() });
    return true;
  }

  // Doses
  async createDose(data: Omit<DoseRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<DoseRecord> {
    const id = generateId('dose_');
    const now = Timestamp.now();
    const dose = {
      ...data,
      scheduledAt: Timestamp.fromDate(data.scheduledAt),
      takenAt: data.takenAt ? Timestamp.fromDate(data.takenAt) : null,
      createdAt: now,
      updatedAt: now
    };
    await this.db.collection(COLLECTIONS.DOSES).doc(id).set(dose);
    return { ...data, id, createdAt: now.toDate(), updatedAt: now.toDate() };
  }

  async getDose(id: string): Promise<DoseRecord | null> {
    const doc = await this.db.collection(COLLECTIONS.DOSES).doc(id).get();
    return docToDose(doc);
  }

  async getDosesByMedication(medicationId: MedicationId, startDate?: Date, endDate?: Date): Promise<DoseRecord[]> {
    let query: Query = this.db.collection(COLLECTIONS.DOSES)
      .where('medicationId', '==', medicationId)
      .orderBy('scheduledAt');
    
    if (startDate) {
      query = query.where('scheduledAt', '>=', Timestamp.fromDate(startDate));
    }
    if (endDate) {
      query = query.where('scheduledAt', '<=', Timestamp.fromDate(endDate));
    }
    
    const snapshot = await query.get();
    return snapshot.docs.map(docToDose).filter((d): d is DoseRecord => d !== null);
  }

  async getDosesByHousehold(householdId: HouseholdId, startDate?: Date, endDate?: Date): Promise<DoseRecord[]> {
    // Firestore doesn't support joins, so we query medications first then doses
    // This is a known limitation - in production we'd denormalize householdId on doses
    const meds = await this.getMedicationsByHousehold(householdId);
    const medIds = meds.map(m => m.id);
    
    if (medIds.length === 0) return [];
    
    // Firestore 'in' query supports max 30 values
    const chunks: MedicationId[][] = [];
    for (let i = 0; i < medIds.length; i += 30) {
      chunks.push(medIds.slice(i, i + 30));
    }
    
    const allDoses: DoseRecord[] = [];
    for (const chunk of chunks) {
      let query: Query = this.db.collection(COLLECTIONS.DOSES)
        .where('medicationId', 'in', chunk)
        .orderBy('scheduledAt');
      
      if (startDate) {
        query = query.where('scheduledAt', '>=', Timestamp.fromDate(startDate));
      }
      if (endDate) {
        query = query.where('scheduledAt', '<=', Timestamp.fromDate(endDate));
      }
      
      const snapshot = await query.get();
      allDoses.push(...snapshot.docs.map(docToDose).filter((d): d is DoseRecord => d !== null));
    }
    
    return allDoses.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
  }

  async updateDose(id: string, data: Partial<DoseRecord>): Promise<DoseRecord | null> {
    const ref = this.db.collection(COLLECTIONS.DOSES).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return null;
    
    const updateData: Record<string, unknown> = { ...data, updatedAt: Timestamp.now() };
    if (data.scheduledAt) updateData.scheduledAt = Timestamp.fromDate(data.scheduledAt);
    if (data.takenAt) updateData.takenAt = Timestamp.fromDate(data.takenAt);
    if (data.takenAt === null) updateData.takenAt = null;
    
    await ref.update(updateData);
    return this.getDose(id);
  }

  // Appointments
  async createAppointment(data: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<Appointment> {
    const id = generateId('apt_') as AppointmentId;
    const now = Timestamp.now();
    const appointment = {
      ...data,
      scheduledAt: Timestamp.fromDate(data.scheduledAt),
      createdAt: now,
      updatedAt: now,
      deletedAt: null
    };
    await this.db.collection(COLLECTIONS.APPOINTMENTS).doc(id).set(appointment);
    return { ...data, id, createdAt: now.toDate(), updatedAt: now.toDate(), deletedAt: null };
  }

  async getAppointment(id: AppointmentId): Promise<Appointment | null> {
    const doc = await this.db.collection(COLLECTIONS.APPOINTMENTS).doc(id).get();
    const apt = docToAppointment(doc);
    return apt?.deletedAt ? null : apt;
  }

  async getAppointmentsByHousehold(householdId: HouseholdId, includeDeleted = false): Promise<Appointment[]> {
    let query: Query = this.db.collection(COLLECTIONS.APPOINTMENTS)
      .where('householdId', '==', householdId)
      .orderBy('scheduledAt');
    
    if (!includeDeleted) {
      query = query.where('deletedAt', '==', null);
    }
    
    const snapshot = await query.get();
    return snapshot.docs.map(docToAppointment).filter((a): a is Appointment => a !== null);
  }

  async updateAppointment(id: AppointmentId, data: Partial<Appointment>): Promise<Appointment | null> {
    const ref = this.db.collection(COLLECTIONS.APPOINTMENTS).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return null;
    const existing = docToAppointment(doc);
    if (existing?.deletedAt) return null;
    
    const updateData: Record<string, unknown> = { ...data, updatedAt: Timestamp.now() };
    if (data.scheduledAt) updateData.scheduledAt = Timestamp.fromDate(data.scheduledAt);
    
    await ref.update(updateData);
    return this.getAppointment(id);
  }

  async deleteAppointment(id: AppointmentId): Promise<boolean> {
    const ref = this.db.collection(COLLECTIONS.APPOINTMENTS).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return false;
    await ref.update({ deletedAt: Timestamp.now(), updatedAt: Timestamp.now() });
    return true;
  }

  // Pending Changes
  async createChange(data: Omit<PendingChange, 'id' | 'createdAt' | 'updatedAt'>): Promise<PendingChange> {
    const id = generateId('chg_') as ChangeId;
    const now = Timestamp.now();
    const change = {
      ...data,
      expiresAt: Timestamp.fromDate(data.expiresAt),
      createdAt: now,
      updatedAt: now
    };
    await this.db.collection(COLLECTIONS.CHANGES).doc(id).set(change);
    return { ...data, id, createdAt: now.toDate(), updatedAt: now.toDate() };
  }

  async getChange(id: ChangeId): Promise<PendingChange | null> {
    const doc = await this.db.collection(COLLECTIONS.CHANGES).doc(id).get();
    return docToChange(doc);
  }

  async getChangesByHousehold(householdId: HouseholdId, status?: ChangeStatus): Promise<PendingChange[]> {
    let query: Query = this.db.collection(COLLECTIONS.CHANGES)
      .where('householdId', '==', householdId)
      .orderBy('createdAt');
    
    if (status) {
      query = query.where('status', '==', status);
    }
    
    const snapshot = await query.get();
    return snapshot.docs.map(docToChange).filter((c): c is PendingChange => c !== null);
  }

  async updateChange(id: ChangeId, data: Partial<PendingChange>): Promise<PendingChange | null> {
    const ref = this.db.collection(COLLECTIONS.CHANGES).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return null;
    
    const updateData: Record<string, unknown> = { ...data, updatedAt: Timestamp.now() };
    if (data.decidedAt) updateData.decidedAt = Timestamp.fromDate(data.decidedAt);
    if (data.expiresAt) updateData.expiresAt = Timestamp.fromDate(data.expiresAt);
    
    await ref.update(updateData);
    return this.getChange(id);
  }

  // Activity Log (append-only)
  async createActivityLog(data: Omit<ActivityLogEntry, 'id' | 'createdAt'>): Promise<ActivityLogEntry> {
    const id = generateId('act_') as ActivityId;
    const now = Timestamp.now();
    const entry = {
      ...data,
      createdAt: now
    };
    await this.db.collection(COLLECTIONS.ACTIVITY_LOG).doc(id).set(entry);
    return { ...data, id, createdAt: now.toDate() };
  }

  async getActivityLog(householdId: HouseholdId, limit = 50, cursor?: string): Promise<{ entries: ActivityLogEntry[]; nextCursor: string | null }> {
    let query: Query = this.db.collection(COLLECTIONS.ACTIVITY_LOG)
      .where('householdId', '==', householdId)
      .orderBy('createdAt', 'desc')
      .limit(limit + 1);
    
    if (cursor) {
      const cursorDoc = await this.db.collection(COLLECTIONS.ACTIVITY_LOG).doc(cursor).get();
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc);
      }
    }
    
    const snapshot = await query.get();
    const entries = snapshot.docs.map(docToActivity).filter((e): e is ActivityLogEntry => e !== null);
    const hasMore = entries.length > limit;
    const page = hasMore ? entries.slice(0, limit) : entries;
    const nextCursor = hasMore ? page[page.length - 1].id : null;
    
    return { entries: page, nextCursor };
  }

  // Consents
  async createConsent(data: Omit<ConsentRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<ConsentRecord> {
    const id = generateId('cst_') as ConsentId;
    const now = Timestamp.now();
    const consent = {
      ...data,
      grantedAt: data.granted ? Timestamp.fromDate(data.grantedAt!) : null,
      revokedAt: data.revokedAt ? Timestamp.fromDate(data.revokedAt!) : null,
      createdAt: now,
      updatedAt: now
    };
    await this.db.collection(COLLECTIONS.CONSENTS).doc(id).set(consent);
    return { ...data, id, createdAt: now.toDate(), updatedAt: now.toDate() };
  }

  async getConsent(householdId: HouseholdId, memberId: MemberId, type: string): Promise<ConsentRecord | null> {
    const snapshot = await this.db.collection(COLLECTIONS.CONSENTS)
      .where('householdId', '==', householdId)
      .where('memberId', '==', memberId)
      .where('type', '==', type)
      .limit(1)
      .get();
    if (snapshot.empty) return null;
    return docToConsent(snapshot.docs[0]);
  }

  async getConsentsByHousehold(householdId: HouseholdId): Promise<ConsentRecord[]> {
    const snapshot = await this.db.collection(COLLECTIONS.CONSENTS)
      .where('householdId', '==', householdId)
      .get();
    return snapshot.docs.map(docToConsent).filter((c): c is ConsentRecord => c !== null);
  }

  async updateConsent(id: ConsentId, data: Partial<ConsentRecord>): Promise<ConsentRecord | null> {
    const ref = this.db.collection(COLLECTIONS.CONSENTS).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return null;
    
    const updateData: Record<string, unknown> = { ...data, updatedAt: Timestamp.now() };
    if (data.grantedAt) updateData.grantedAt = Timestamp.fromDate(data.grantedAt);
    if (data.revokedAt) updateData.revokedAt = Timestamp.fromDate(data.revokedAt);
    if (data.grantedAt === null) updateData.grantedAt = null;
    if (data.revokedAt === null) updateData.revokedAt = null;
    
    await ref.update(updateData);
    return docToConsent(await ref.get());
  }

  // Reminder deduplication
  async checkAndSetReminderSent(key: string): Promise<boolean> {
    const ref = this.db.collection(COLLECTIONS.REMINDER_DEDUPE).doc(key);
    const doc = await ref.get();
    if (doc.exists) return false;
    
    await ref.set({ createdAt: Timestamp.now() });
    return true;
  }

  // Batch operations
  async batchWrite(operations: Array<{ type: 'create' | 'update' | 'delete'; collection: string; id?: string; data?: unknown }>): Promise<void> {
    const batch = this.db.batch();
    
    for (const op of operations) {
      const ref = this.db.collection(op.collection).doc(op.id || generateId());
      const data = op.data && typeof op.data === 'object' && !Array.isArray(op.data)
        ? op.data as Record<string, unknown>
        : {};
      
      switch (op.type) {
        case 'create':
          batch.set(ref, { ...data, createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
          break;
        case 'update':
          batch.update(ref, { ...data, updatedAt: Timestamp.now() });
          break;
        case 'delete':
          batch.update(ref, { deletedAt: Timestamp.now(), updatedAt: Timestamp.now() });
          break;
      }
    }
    
    await batch.commit();
  }
}