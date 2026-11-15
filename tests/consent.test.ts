/**
 * Tests for consent gating
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  initializeConsents, 
  getConsentStatus, 
  getAllConsents, 
  updateConsent, 
  bulkUpdateConsents,
  hasAIConsent,
  hasEmailConsent,
  hasDataProcessingConsent,
  DEFAULT_CONSENTS,
  CONSENT_VERSION
} from '@/lib/consent';
import { ConsentType, ConsentRecord, HouseholdId, MemberId } from '@/types';
import { InMemoryRepository } from '@/lib/repositories/in-memory';
import { setRepositoryForTesting } from '@/lib/repositories';

describe('Consent Management', () => {
  let repo: InMemoryRepository;
  const householdId = 'hh_1' as HouseholdId;
  const memberId = 'mem_1' as MemberId;

  beforeEach(() => {
    repo = new InMemoryRepository();
    setRepositoryForTesting(repo);
  });

  afterEach(() => {
    InMemoryRepository.clear();
  });

  it('initializes default consents (all unchecked)', async () => {
    const records = await initializeConsents(householdId, memberId);
    
    expect(records).toHaveLength(3);
    for (const record of records) {
      expect(record.granted).toBe(false);
      expect(record.version).toBe(CONSENT_VERSION);
      expect(record.grantedAt).toBeNull();
      expect(record.revokedAt).toBeNull();
    }
    
    const types = records.map(r => r.type).sort();
    expect(types).toEqual(['ai_photo_processing', 'data_processing', 'email_reminders']);
  });

  it('gets consent status', async () => {
    await initializeConsents(householdId, memberId);
    
    const status = await getConsentStatus(householdId, memberId, 'data_processing');
    expect(status.granted).toBe(false);
    expect(status.version).toBe(CONSENT_VERSION);
  });

  it('gets all consents', async () => {
    await initializeConsents(householdId, memberId);
    
    const all = await getAllConsents(householdId, memberId);
    expect(all.data_processing.granted).toBe(false);
    expect(all.ai_photo_processing.granted).toBe(false);
    expect(all.email_reminders.granted).toBe(false);
  });

  it('grants consent', async () => {
    await initializeConsents(householdId, memberId);
    
    const record = await updateConsent(householdId, memberId, 'ai_photo_processing', true, memberId);
    expect(record.granted).toBe(true);
    expect(record.grantedAt).not.toBeNull();
    expect(record.revokedAt).toBeNull();
    expect(record.version).toBe(CONSENT_VERSION + 1);
  });

  it('revokes consent', async () => {
    await initializeConsents(householdId, memberId);
    await updateConsent(householdId, memberId, 'ai_photo_processing', true, memberId);
    
    const record = await updateConsent(householdId, memberId, 'ai_photo_processing', false, memberId);
    expect(record.granted).toBe(false);
    expect(record.revokedAt).not.toBeNull();
    expect(record.version).toBe(CONSENT_VERSION + 2);
  });

  it('bulk updates consents', async () => {
    await initializeConsents(householdId, memberId);
    
    const records = await bulkUpdateConsents(householdId, memberId, {
      data_processing: true,
      ai_photo_processing: true,
      email_reminders: false
    }, memberId);
    
    expect(records).toHaveLength(3);
    const aiConsent = records.find(r => r.type === 'ai_photo_processing');
    expect(aiConsent?.granted).toBe(true);
  });

  it('checks AI consent gate', async () => {
    await initializeConsents(householdId, memberId);
    
    expect(await hasAIConsent(householdId, memberId)).toBe(false);
    
    await updateConsent(householdId, memberId, 'ai_photo_processing', true, memberId);
    expect(await hasAIConsent(householdId, memberId)).toBe(true);
  });

  it('checks email consent gate', async () => {
    await initializeConsents(householdId, memberId);
    
    expect(await hasEmailConsent(householdId, memberId)).toBe(false);
    
    await updateConsent(householdId, memberId, 'email_reminders', true, memberId);
    expect(await hasEmailConsent(householdId, memberId)).toBe(true);
  });

  it('checks data processing consent gate', async () => {
    await initializeConsents(householdId, memberId);
    
    expect(await hasDataProcessingConsent(householdId, memberId)).toBe(false);
    
    await updateConsent(householdId, memberId, 'data_processing', true, memberId);
    expect(await hasDataProcessingConsent(householdId, memberId)).toBe(true);
  });

  it('defaults to false for unknown member', async () => {
    expect(await hasAIConsent(householdId, 'unknown' as MemberId)).toBe(false);
  });
});