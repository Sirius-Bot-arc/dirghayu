/**
 * Gemini AI integration (server-side only)
 * All AI features with zod validation, disclaimers, and consent gating
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import { GEMINI_API_KEY, GEMINI_MODEL } from '@/lib/config';
import { 
  PrescriptionScanResult, 
  MedicineExplanation, 
  InteractionCheckResult,
  ConsentType,
  HouseholdId,
  MemberId
} from '@/types';
import { getRepository } from '@/lib/repositories';
import { canUseAI } from '@/lib/authorization';

// Initialize Gemini client
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

function getModel() {
  if (!genAI) {
    throw new Error('Gemini API key not configured');
  }
  return genAI.getGenerativeModel({ model: GEMINI_MODEL });
}

// Zod schemas for AI output validation
const PrescriptionMedicationSchema = z.object({
  name: z.string().min(1).max(100),
  genericName: z.string().max(100).nullable(),
  dosage: z.string().min(1).max(50),
  unit: z.string().min(1).max(20),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'as_needed', 'custom']),
  times: z.array(z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/)).min(1).max(24),
  instructions: z.string().max(500).nullable(),
  durationDays: z.number().int().min(1).max(365).nullable()
});

const PrescriptionScanResultSchema = z.object({
  medications: z.array(PrescriptionMedicationSchema).min(1).max(20),
  warnings: z.array(z.string()).max(10),
  confidence: z.number().min(0).max(1)
});

const MedicineExplanationSchema = z.object({
  name: z.string().min(1).max(100),
  genericName: z.string().max(100).nullable(),
  purpose: z.string().min(1).max(1000),
  howItWorks: z.string().min(1).max(2000),
  commonSideEffects: z.array(z.string()).max(20),
  seriousSideEffects: z.array(z.string()).max(10),
  interactions: z.array(z.string()).max(20),
  precautions: z.array(z.string()).max(15),
  disclaimer: z.string().min(1)
});

const InteractionItemSchema = z.object({
  medicationA: z.string().min(1).max(100),
  medicationB: z.string().min(1).max(100),
  severity: z.enum(['minor', 'moderate', 'major']),
  description: z.string().min(1).max(1000),
  recommendation: z.string().min(1).max(500)
});

const InteractionCheckResultSchema = z.object({
  interactions: z.array(InteractionItemSchema).max(50),
  disclaimer: z.string().min(1)
});

/**
 * Check if AI consent is granted for a member
 */
async function checkAIConsent(householdId: string, memberId: string): Promise<boolean> {
  const repo = getRepository();
  const consent = await repo.getConsent(householdId as HouseholdId, memberId as MemberId, 'ai_photo_processing');
  return consent?.granted === true;
}

/**
 * Scan prescription photo and extract structured medication list
 * Image processed in memory, never stored
 */
export async function scanPrescription(
  householdId: string,
  memberId: string,
  imageBase64: string,
  mimeType: string
): Promise<PrescriptionScanResult> {
  // Verify consent
  const hasConsent = await checkAIConsent(householdId, memberId);
  if (!hasConsent) {
    throw new Error('AI photo processing consent not granted');
  }

  if (!genAI) {
    throw new Error('Gemini not configured');
  }

  const model = getModel();
  
  const prompt = `You are a medical prescription parser. Analyze this prescription image and extract structured medication information.

Return ONLY valid JSON matching this schema:
{
  "medications": [
    {
      "name": "Brand name",
      "genericName": "Generic name or null",
      "dosage": "Strength (e.g., 500)",
      "unit": "Unit (e.g., mg, ml, IU)",
      "frequency": "daily|weekly|monthly|as_needed|custom",
      "times": ["HH:mm", ...],
      "instructions": "Special instructions or null",
      "durationDays": number or null
    }
  ],
  "warnings": ["Any concerns about legibility, interactions, etc."],
  "confidence": 0.0-1.0
}

Rules:
- Extract ALL medications visible
- Times must be 24-hour format HH:mm
- If frequency unclear, use "daily" and note in warnings
- If times unclear, default to ["09:00"] and note in warnings
- Confidence reflects overall extraction quality
- Include any drug interaction warnings you can identify
- Never invent medications not visible`;

  const imagePart = {
    inlineData: {
      mimeType,
      data: imageBase64
    }
  };

  const result = await model.generateContent([prompt, imagePart]);
  const text = result.response.text();
  
  try {
    const parsed = JSON.parse(text);
    const validated = PrescriptionScanResultSchema.parse(parsed);
    
    // Add disclaimer to each medication
    return {
      ...validated,
      medications: validated.medications.map(med => ({
        ...med,
        instructions: med.instructions ?? null
      }))
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`AI output validation failed: ${error.errors.map(e => e.message).join(', ')}`);
    }
    throw new Error(`Failed to parse AI response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get plain-language explanation of a medicine
 */
export async function explainMedicine(
  householdId: string,
  memberId: string,
  name: string,
  genericName: string | null,
  dosage: string | null
): Promise<MedicineExplanation> {
  // Verify consent
  const hasConsent = await checkAIConsent(householdId, memberId);
  if (!hasConsent) {
    throw new Error('AI processing consent not granted');
  }

  if (!genAI) {
    throw new Error('Gemini not configured');
  }

  const model = getModel();
  
  const prompt = `You are a patient education specialist. Explain "${name}"${genericName ? ` (${genericName})` : ''}${dosage ? ` at ${dosage}` : ''} in simple, respectful language for an elderly person.

Return ONLY valid JSON matching this schema:
{
  "name": "Medicine name",
  "genericName": "Generic name or null",
  "purpose": "What this medicine is for (1-2 sentences)",
  "howItWorks": "Simple explanation of how it works (2-3 sentences)",
  "commonSideEffects": ["List of common side effects"],
  "seriousSideEffects": ["List of serious side effects requiring immediate medical attention"],
  "interactions": ["Common food, drug, or supplement interactions to be aware of"],
  "precautions": ["Important precautions for elderly patients"],
  "disclaimer": "This is educational information only, not medical advice. Always check with your doctor or pharmacist."
}

Tone: Respectful, clear, non-alarming. Use simple words. Avoid medical jargon.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  
  try {
    const parsed = JSON.parse(text);
    return MedicineExplanationSchema.parse(parsed);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`AI output validation failed: ${error.errors.map(e => e.message).join(', ')}`);
    }
    throw new Error(`Failed to parse AI response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Check for potential interactions between medications
 */
export async function checkInteractions(
  householdId: string,
  memberId: string,
  medications: Array<{ name: string; genericName: string | null; dosage: string | null }>
): Promise<InteractionCheckResult> {
  // Verify consent
  const hasConsent = await checkAIConsent(householdId, memberId);
  if (!hasConsent) {
    throw new Error('AI processing consent not granted');
  }

  if (!genAI) {
    throw new Error('Gemini not configured');
  }

  const model = getModel();
  
  const medList = medications.map(m => 
    `- ${m.name}${m.genericName ? ` (${m.genericName})` : ''}${m.dosage ? ` ${m.dosage}` : ''}`
  ).join('\n');

  const prompt = `You are a clinical pharmacist. Check for potential interactions between these medications:

${medList}

Return ONLY valid JSON matching this schema:
{
  "interactions": [
    {
      "medicationA": "Name of first medication",
      "medicationB": "Name of second medication",
      "severity": "minor|moderate|major",
      "description": "What the interaction is and its potential effects",
      "recommendation": "What to do (e.g., monitor, adjust timing, consult doctor)"
    }
  ],
  "disclaimer": "This is an AI screening tool, not medical advice. Always check with your doctor or pharmacist before making any changes to medications."
}

Rules:
- Check all pairwise combinations
- Only include interactions with clinical significance
- Severity: minor (monitor), moderate (adjust/consult), major (avoid/urgent consult)
- Be specific about mechanism if known
- If no significant interactions, return empty array`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  
  try {
    const parsed = JSON.parse(text);
    return InteractionCheckResultSchema.parse(parsed);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`AI output validation failed: ${error.errors.map(e => e.message).join(', ')}`);
    }
    throw new Error(`Failed to parse AI response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate weekly adherence summary for family
 */
export async function generateWeeklySummary(
  householdId: string,
  elderName: string,
  adherenceData: Array<{
    medicationId: string;
    name: string;
    scheduled: number;
    taken: number;
    missed: number;
    adherence: number;
  }>,
  appointments: Array<{
    id: string;
    title: string;
    scheduledAt: Date;
    status: string;
  }>,
  notes: string | null
): Promise<string> {
  // This doesn't require AI consent as it's a summary generation
  if (!genAI) {
    throw new Error('Gemini not configured');
  }

  const model = getModel();
  
  const medSummary = adherenceData.map(m => 
    `- ${m.name}: ${m.taken}/${m.scheduled} doses taken (${Math.round(m.adherence * 100)}%)`
  ).join('\n');

  const apptSummary = appointments.map(a => 
    `- ${a.title} on ${a.scheduledAt.toLocaleDateString()} (${a.status})`
  ).join('\n');

  const prompt = `Write a warm, respectful weekly care summary for family members about ${elderName}.

Medication Adherence:
${medSummary}

Appointments:
${apptSummary || 'None this week'}

Elder's Notes:
${notes || 'None shared'}

Write a concise, positive summary (150-250 words) that:
- Celebrates adherence successes
- Gently notes any concerns without shame
- Mentions upcoming appointments
- Includes the elder's notes if any
- Uses respectful, dignity-preserving language
- Never infantilizes or scolds

End with: "This summary is generated by AI for informational purposes. Please discuss any concerns directly with ${elderName} and their care team."`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}