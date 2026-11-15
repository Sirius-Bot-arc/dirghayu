/**
 * Audit logging - append-only activity log
 * Records who did what when for accountability
 */

import { getRepository } from '@/lib/repositories';
import { ActivityLogEntry, MemberId, HouseholdId, ActivityId } from '@/types';

/** Action types for audit log */
export type AuditAction = 
  | 'household_created' | 'household_deleted'
  | 'member_added' | 'member_updated' | 'member_removed'
  | 'medication_created' | 'medication_updated' | 'medication_deleted' | 'dose_recorded' | 'dose_skipped'
  | 'appointment_created' | 'appointment_updated' | 'appointment_deleted'
  | 'change_proposed' | 'change_approved' | 'change_rejected'
  | 'consent_granted' | 'consent_revoked'
  | 'visibility_updated'
  | 'data_exported' | 'data_deleted'
  | 'login' | 'logout' | 'passcode_changed'
  | 'ai_prescription_scan' | 'ai_explain_medicine' | 'ai_check_interactions';

/** Resource types for audit log */
export type AuditResourceType = 
  | 'household' | 'member' | 'medication' | 'appointment' 
  | 'dose' | 'change' | 'consent' | 'visibility' | 'export' | 'ai';

/**
 * Log an activity (append-only)
 */
export async function logActivity(params: {
  householdId: HouseholdId;
  memberId: MemberId;
  action: AuditAction;
  resourceType: AuditResourceType;
  resourceId: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<ActivityLogEntry> {
  const repo = getRepository();
  
  return repo.createActivityLog({
    householdId: params.householdId,
    memberId: params.memberId,
    action: params.action,
    resourceType: params.resourceType,
    resourceId: params.resourceId,
    metadata: params.metadata ?? {},
    ipAddress: params.ipAddress ?? null,
    userAgent: params.userAgent ?? null
  });
}

/**
 * Log medication-related activity
 */
export async function logMedicationActivity(
  householdId: HouseholdId,
  memberId: MemberId,
  action: 'created' | 'updated' | 'deleted' | 'dose_taken' | 'dose_skipped',
  medicationId: string,
  metadata: Record<string, unknown> = {},
  ipAddress?: string,
  userAgent?: string
): Promise<ActivityLogEntry> {
  return logActivity({
    householdId,
    memberId,
    action: `medication_${action}` as AuditAction,
    resourceType: action.includes('dose') ? 'dose' : 'medication',
    resourceId: medicationId,
    metadata,
    ipAddress,
    userAgent
  });
}

/**
 * Log appointment-related activity
 */
export async function logAppointmentActivity(
  householdId: HouseholdId,
  memberId: MemberId,
  action: 'created' | 'updated' | 'deleted',
  appointmentId: string,
  metadata: Record<string, unknown> = {},
  ipAddress?: string,
  userAgent?: string
): Promise<ActivityLogEntry> {
  return logActivity({
    householdId,
    memberId,
    action: `appointment_${action}` as AuditAction,
    resourceType: 'appointment',
    resourceId: appointmentId,
    metadata,
    ipAddress,
    userAgent
  });
}

/**
 * Log pending change activity
 */
export async function logChangeActivity(
  householdId: HouseholdId,
  memberId: MemberId,
  action: 'proposed' | 'approved' | 'rejected',
  changeId: string,
  metadata: Record<string, unknown> = {},
  ipAddress?: string,
  userAgent?: string
): Promise<ActivityLogEntry> {
  return logActivity({
    householdId,
    memberId,
    action: `change_${action}` as AuditAction,
    resourceType: 'change',
    resourceId: changeId,
    metadata,
    ipAddress,
    userAgent
  });
}

/**
 * Log consent activity
 */
export async function logConsentActivity(
  householdId: HouseholdId,
  memberId: MemberId,
  action: 'granted' | 'revoked',
  consentType: string,
  metadata: Record<string, unknown> = {},
  ipAddress?: string,
  userAgent?: string
): Promise<ActivityLogEntry> {
  return logActivity({
    householdId,
    memberId,
    action: `consent_${action}` as AuditAction,
    resourceType: 'consent',
    resourceId: consentType,
    metadata,
    ipAddress,
    userAgent
  });
}

/**
 * Log AI activity
 */
export async function logAIActivity(
  householdId: HouseholdId,
  memberId: MemberId,
  action: 'prescription_scan' | 'explain_medicine' | 'check_interactions',
  resourceId: string,
  metadata: Record<string, unknown> = {},
  ipAddress?: string,
  userAgent?: string
): Promise<ActivityLogEntry> {
  return logActivity({
    householdId,
    memberId,
    action: `ai_${action}` as AuditAction,
    resourceType: 'ai',
    resourceId,
    metadata: {
      ...metadata,
      disclaimerShown: true
    },
    ipAddress,
    userAgent
  });
}

/**
 * Log data export/deletion
 */
export async function logDataActivity(
  householdId: HouseholdId,
  memberId: MemberId,
  action: 'exported' | 'deleted',
  metadata: Record<string, unknown> = {},
  ipAddress?: string,
  userAgent?: string
): Promise<ActivityLogEntry> {
  return logActivity({
    householdId,
    memberId,
    action: `data_${action}` as AuditAction,
    resourceType: 'export',
    resourceId: null,
    metadata,
    ipAddress,
    userAgent
  });
}