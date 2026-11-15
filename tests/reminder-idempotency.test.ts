/**
 * Tests for reminder idempotency (deduplication)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InMemoryRepository } from '@/lib/repositories/in-memory';
import { setRepositoryForTesting, getRepository } from '@/lib/repositories';
import { generateDedupeKey } from '@/lib/reminders';
import { HouseholdId, MemberId } from '@/types';

describe('Reminder Idempotency', () => {
  let repo: InMemoryRepository;
  const householdId = 'hh_1' as HouseholdId;
  const memberId = 'mem_1' as MemberId;
  const medicationId = 'med_1' as any;

  beforeEach(() => {
    repo = new InMemoryRepository();
    setRepositoryForTesting(repo);
  });

  afterEach(() => {
    InMemoryRepository.clear();
  });

  it('allows first reminder send', async () => {
    const key = generateDedupeKey(householdId, memberId, 'upcoming_dose', medicationId, 0, new Date());
    const canSend = await repo.checkAndSetReminderSent(key);
    expect(canSend).toBe(true);
  });

  it('blocks duplicate reminder send', async () => {
    const key = generateDedupeKey(householdId, memberId, 'upcoming_dose', medicationId, 0, new Date());
    await repo.checkAndSetReminderSent(key);
    const canSend = await repo.checkAndSetReminderSent(key);
    expect(canSend).toBe(false);
  });

  it('allows different stage for same reference', async () => {
    const baseKey = generateDedupeKey(householdId, memberId, 'missed_dose', medicationId, 0, new Date());
    await repo.checkAndSetReminderSent(baseKey);
    
    const escalationKey = generateDedupeKey(householdId, memberId, 'escalation_caretaker', medicationId, 1, new Date());
    const canSend = await repo.checkAndSetReminderSent(escalationKey);
    expect(canSend).toBe(true);
  });

  it('allows different recipient for same reminder', async () => {
    const key1 = generateDedupeKey(householdId, memberId, 'upcoming_dose', medicationId, 0, new Date());
    await repo.checkAndSetReminderSent(key1);
    
    const key2 = generateDedupeKey(householdId, 'mem_2' as MemberId, 'upcoming_dose', medicationId, 0, new Date());
    const canSend = await repo.checkAndSetReminderSent(key2);
    expect(canSend).toBe(true);
  });

  it('allows different date for same reminder', async () => {
    const date1 = new Date('2024-01-15T09:00:00Z');
    const date2 = new Date('2024-01-16T09:00:00Z');
    
    const key1 = generateDedupeKey(householdId, memberId, 'upcoming_dose', medicationId, 0, date1);
    await repo.checkAndSetReminderSent(key1);
    
    const key2 = generateDedupeKey(householdId, memberId, 'upcoming_dose', medicationId, 0, date2);
    const canSend = await repo.checkAndSetReminderSent(key2);
    expect(canSend).toBe(true);
  });

  it('generates unique keys for different reminder types', async () => {
    const date = new Date('2024-01-15T09:00:00Z');
    
    const keys = [
      generateDedupeKey(householdId, memberId, 'upcoming_dose', medicationId, 0, date),
      generateDedupeKey(householdId, memberId, 'missed_dose', medicationId, 0, date),
      generateDedupeKey(householdId, memberId, 'upcoming_appointment', 'apt_1' as any, 0, date),
      generateDedupeKey(householdId, memberId, 'escalation_caretaker', medicationId, 1, date),
      generateDedupeKey(householdId, memberId, 'escalation_family', medicationId, 2, date),
      generateDedupeKey(householdId, memberId, 'refill_low', medicationId, 0, date),
    ];

    // All keys should be unique
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(keys.length);
  });
});