/**
 * Consent management - granular, versioned, timestamped
 * Block AI scanning without AI consent
 */

import { getRepository } from '@/lib/repositories';
import { ConsentRecord, ConsentType, ConsentId, HouseholdId, MemberId } from '@/types';

/** Default consent state (all unchecked) */
export const DEFAULT_CONSENTS: Record<ConsentType, boolean> = {
  data_processing: false,
  ai_photo_processing: false,
  email_reminders: false
};

/** Consent version for future-proofing */
export const CONSENT_VERSION = 1;

/**
 * Initialize default consents for a new member
 */
export async function initializeConsents(
  householdId: HouseholdId,
  memberId: MemberId
): Promise<ConsentRecord[]> {
  const repo = getRepository();
  const records: ConsentRecord[] = [];

  for (const [type, granted] of Object.entries(DEFAULT_CONSENTS)) {
    const record = await repo.createConsent({
      householdId,
      memberId,
      type: type as ConsentType,
      version: CONSENT_VERSION,
      granted,
      grantedAt: null,
      revokedAt: null
    });
    records.push(record);
  }

  return records;
}

/**
 * Get consent status for a member
 */
export async function getConsentStatus(
  householdId: HouseholdId,
  memberId: MemberId,
  type: ConsentType
): Promise<{ granted: boolean; version: number; grantedAt: Date | null }> {
  const repo = getRepository();
  const consent = await repo.getConsent(householdId, memberId, type);
  
  return {
    granted: consent?.granted ?? false,
    version: consent?.version ?? CONSENT_VERSION,
    grantedAt: consent?.grantedAt ?? null
  };
}

/**
 * Get all consents for a member
 */
export async function getAllConsents(
  householdId: HouseholdId,
  memberId: MemberId
): Promise<Record<ConsentType, { granted: boolean; version: number; grantedAt: Date | null }>> {
  const repo = getRepository();
  const consents = await repo.getConsentsByHousehold(householdId);
  const memberConsents = consents.filter(c => c.memberId === memberId);
  
  const result: Record<ConsentType, { granted: boolean; version: number; grantedAt: Date | null }> = {
    data_processing: { granted: false, version: CONSENT_VERSION, grantedAt: null },
    ai_photo_processing: { granted: false, version: CONSENT_VERSION, grantedAt: null },
    email_reminders: { granted: false, version: CONSENT_VERSION, grantedAt: null }
  };
  
  for (const consent of memberConsents) {
    result[consent.type] = {
      granted: consent.granted,
      version: consent.version,
      grantedAt: consent.grantedAt
    };
  }
  
  return result;
}

/**
 * Update consent (grant or revoke)
 */
export async function updateConsent(
  householdId: HouseholdId,
  memberId: MemberId,
  type: ConsentType,
  granted: boolean,
  requesterId: MemberId
): Promise<ConsentRecord> {
  const repo = getRepository();
  const now = new Date();
  
  let consent = await repo.getConsent(householdId, memberId, type);
  
  if (!consent) {
    consent = await repo.createConsent({
      householdId,
      memberId,
      type,
      version: CONSENT_VERSION,
      granted,
      grantedAt: granted ? now : null,
      revokedAt: !granted ? now : null
    });
  } else {
    consent = await repo.updateConsent(consent.id, {
      granted,
      grantedAt: granted ? now : consent.grantedAt,
      revokedAt: !granted ? now : consent.revokedAt,
      version: consent.version + 1
    }) as ConsentRecord;
  }
  
  // Log the consent change
  const { logConsentActivity } = await import('@/lib/audit');
  await logConsentActivity(householdId, requesterId, granted ? 'granted' : 'revoked', type, {
    targetMemberId: memberId,
    version: consent.version
  });
  
  return consent!;
}

/**
 * Bulk update consents
 */
export async function bulkUpdateConsents(
  householdId: HouseholdId,
  memberId: MemberId,
  consents: Record<ConsentType, boolean>,
  requesterId: MemberId
): Promise<ConsentRecord[]> {
  const results: ConsentRecord[] = [];
  
  for (const [type, granted] of Object.entries(consents)) {
    const record = await updateConsent(householdId, memberId, type as ConsentType, granted, requesterId);
    results.push(record);
  }
  
  return results;
}

/**
 * Check if AI consent is granted (for gating AI features)
 */
export async function hasAIConsent(householdId: HouseholdId, memberId: MemberId): Promise<boolean> {
  const status = await getConsentStatus(householdId, memberId, 'ai_photo_processing');
  return status.granted;
}

/**
 * Check if email reminders consent is granted
 */
export async function hasEmailConsent(householdId: HouseholdId, memberId: MemberId): Promise<boolean> {
  const status = await getConsentStatus(householdId, memberId, 'email_reminders');
  return status.granted;
}

/**
 * Check if data processing consent is granted
 */
export async function hasDataProcessingConsent(householdId: HouseholdId, memberId: MemberId): Promise<boolean> {
  const status = await getConsentStatus(householdId, memberId, 'data_processing');
  return status.granted;
}

/**
 * Get consents for all members in household (for admin view)
 */
export async function getHouseholdConsents(householdId: HouseholdId): Promise<ConsentRecord[]> {
  const repo = getRepository();
  return repo.getConsentsByHousehold(householdId);
}