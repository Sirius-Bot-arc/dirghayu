/**
 * Tests for Gemini output validation (mocked)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  scanPrescription, 
  explainMedicine, 
  checkInteractions,
  generateWeeklySummary 
} from '@/lib/gemini';
import { PrescriptionScanResult, MedicineExplanation, InteractionCheckResult } from '@/types';
import { InMemoryRepository } from '@/lib/repositories/in-memory';
import { setRepositoryForTesting } from '@/lib/repositories';
import { HouseholdId, MemberId, ConsentType } from '@/types';

// Mock Google Generative AI
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn().mockReturnValue({
      generateContent: vi.fn()
    })
  }))
}));

const { GoogleGenerativeAI } = await import('@google/generative-ai');

describe('Gemini Output Validation', () => {
  let repo: InMemoryRepository;
  const householdId = 'hh_1' as HouseholdId;
  const memberId = 'mem_elder' as MemberId;

  beforeEach(() => {
    repo = new InMemoryRepository();
    setRepositoryForTesting(repo);
    
    // Setup member with AI consent
    repo.createMember({
      householdId,
      role: 'elder',
      displayName: 'Elder',
      passcodeHash: 'h',
      passcodeSalt: 's',
      email: null,
      emailVerified: false,
      muteSettings: { doseReminders: false, missedDoseAlerts: false, appointmentReminders: false, criticalOnly: false },
      visibility: { medications: true, appointments: true, adherence: true }
    });
    
    // Grant AI consent
    repo.createConsent({
      householdId,
      memberId,
      type: 'ai_photo_processing',
      version: 1,
      granted: true,
      grantedAt: new Date(),
      revokedAt: null
    });
  });

  afterEach(() => {
    InMemoryRepository.clear();
    vi.clearAllMocks();
  });

  it('validates prescription scan output', async () => {
    const mockModel = {
      generateContent: vi.fn().mockResolvedValue({
        response: {
          text: () => JSON.stringify({
            medications: [{
              name: 'Aspirin',
              genericName: 'Acetylsalicylic acid',
              dosage: '100',
              unit: 'mg',
              frequency: 'daily',
              times: ['09:00'],
              instructions: 'Take with food',
              durationDays: 30
            }],
            warnings: ['Check for allergies'],
            confidence: 0.9
          })
        }
      })
    };
    
    (GoogleGenerativeAI as any).mockImplementation(() => ({
      getGenerativeModel: () => mockModel
    }));

    const result = await scanPrescription(householdId, memberId, 'base64image', 'image/jpeg');
    
    expect(result.medications).toHaveLength(1);
    expect(result.medications[0].name).toBe('Aspirin');
    expect(result.medications[0].frequency).toBe('daily');
    expect(result.confidence).toBe(0.9);
  });

  it('rejects invalid prescription scan output', async () => {
    const mockModel = {
      generateContent: vi.fn().mockResolvedValue({
        response: {
          text: () => JSON.stringify({
            medications: [], // Empty - invalid
            warnings: [],
            confidence: 0.5
          })
        }
      })
    };
    
    (GoogleGenerativeAI as any).mockImplementation(() => ({
      getGenerativeModel: () => mockModel
    }));

    await expect(scanPrescription(householdId, memberId, 'base64', 'image/jpeg'))
      .rejects.toThrow('AI output validation failed');
  });

  it('validates medicine explanation output', async () => {
    const mockModel = {
      generateContent: vi.fn().mockResolvedValue({
        response: {
          text: () => JSON.stringify({
            name: 'Aspirin',
            genericName: 'Acetylsalicylic acid',
            purpose: 'Pain relief',
            howItWorks: 'Reduces inflammation',
            commonSideEffects: ['Stomach upset'],
            seriousSideEffects: ['Bleeding'],
            interactions: ['Blood thinners'],
            precautions: ['Take with food'],
            disclaimer: 'Not medical advice'
          })
        }
      })
    };
    
    (GoogleGenerativeAI as any).mockImplementation(() => ({
      getGenerativeModel: () => mockModel
    }));

    const result = await explainMedicine(householdId, memberId, 'Aspirin', 'Acetylsalicylic acid', '100mg');
    
    expect(result.name).toBe('Aspirin');
    expect(result.purpose).toBe('Pain relief');
    expect(result.commonSideEffects).toContain('Stomach upset');
  });

  it('validates interaction check output', async () => {
    const mockModel = {
      generateContent: vi.fn().mockResolvedValue({
        response: {
          text: () => JSON.stringify({
            interactions: [{
              medicationA: 'Aspirin',
              medicationB: 'Warfarin',
              severity: 'major',
              description: 'Increased bleeding risk',
              recommendation: 'Monitor closely'
            }],
            disclaimer: 'Not medical advice'
          })
        }
      })
    };
    
    (GoogleGenerativeAI as any).mockImplementation(() => ({
      getGenerativeModel: () => mockModel
    }));

    const result = await checkInteractions(householdId, memberId, [
      { name: 'Aspirin', genericName: null, dosage: '100mg' },
      { name: 'Warfarin', genericName: null, dosage: '5mg' }
    ]);
    
    expect(result.interactions).toHaveLength(1);
    expect(result.interactions[0].severity).toBe('major');
  });

  it('generates weekly summary', async () => {
    const mockModel = {
      generateContent: vi.fn().mockResolvedValue({
        response: {
          text: () => 'Weekly summary text here'
        }
      })
    };
    
    (GoogleGenerativeAI as any).mockImplementation(() => ({
      getGenerativeModel: () => mockModel
    }));

    const summary = await generateWeeklySummary(
      householdId,
      'Elder',
      [{ medicationId: 'med_1' as any, name: 'Aspirin', scheduled: 14, taken: 13, missed: 1, adherence: 0.93 }],
      [],
      'Feeling good'
    );
    
    expect(summary).toContain('Weekly summary text here');
  });

  it('blocks AI without consent', async () => {
    // Remove consent
    const repo2 = new InMemoryRepository();
    setRepositoryForTesting(repo2);
    repo2.createMember({
      householdId,
      role: 'elder',
      displayName: 'Elder',
      passcodeHash: 'h',
      passcodeSalt: 's',
      email: null,
      emailVerified: false,
      muteSettings: { doseReminders: false, missedDoseAlerts: false, appointmentReminders: false, criticalOnly: false },
      visibility: { medications: true, appointments: true, adherence: true }
    });
    // No consent granted

    await expect(scanPrescription(householdId, memberId, 'base64', 'image/jpeg'))
      .rejects.toThrow('AI photo processing consent not granted');
  });

  it('blocks AI for family members', async () => {
    const familyId = 'mem_family' as MemberId;
    repo.createMember({
      householdId,
      role: 'family',
      displayName: 'Family',
      passcodeHash: 'h',
      passcodeSalt: 's',
      email: null,
      emailVerified: false,
      muteSettings: { doseReminders: false, missedDoseAlerts: false, appointmentReminders: false, criticalOnly: false },
      visibility: { medications: true, appointments: true, adherence: true }
    });
    repo.createConsent({
      householdId,
      memberId: familyId,
      type: 'ai_photo_processing',
      version: 1,
      granted: true,
      grantedAt: new Date(),
      revokedAt: null
    });

    await expect(scanPrescription(householdId, familyId, 'base64', 'image/jpeg'))
      .rejects.toThrow('Family members cannot use AI features');
  });
});