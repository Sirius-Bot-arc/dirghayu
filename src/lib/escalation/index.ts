/**
 * Escalation logic for missed doses
 * Pure, unit-tested function with configurable N and M minutes
 */

import { Member, Role, Medication, DoseRecord } from '@/types';
import { ESCALATION_ELDER_TO_CARETAKER_MIN, ESCALATION_CARETAKER_TO_FAMILY_MIN } from '@/lib/config';

/** Escalation stage */
export type EscalationStage = 0 | 1 | 2;

/** Escalation decision result */
export interface EscalationDecision {
  shouldEscalate: boolean;
  stage: EscalationStage;
  recipients: Member[];
  minutesOverdue: number;
}

/**
 * Calculate escalation for a missed dose
 * Stage 0: Elder reminder (initial)
 * Stage 1: Caretaker notification (after N minutes)
 * Stage 2: Family notification (after M minutes from stage 1)
 */
export function calculateEscalation(
  dose: DoseRecord,
  medication: Medication,
  members: Member[],
  now: Date,
  elderToCaretakerMin: number = ESCALATION_ELDER_TO_CARETAKER_MIN,
  caretakerToFamilyMin: number = ESCALATION_CARETAKER_TO_FAMILY_MIN
): EscalationDecision {
  // Only escalate missed doses that are still pending
  if (dose.status !== 'missed' && dose.status !== 'pending') {
    return { shouldEscalate: false, stage: 0, recipients: [], minutesOverdue: 0 };
  }

  const scheduledTime = dose.scheduledAt.getTime();
  const nowTime = now.getTime();
  const minutesOverdue = Math.floor((nowTime - scheduledTime) / (1000 * 60));

  if (minutesOverdue < 0) {
    return { shouldEscalate: false, stage: 0, recipients: [], minutesOverdue: 0 };
  }

  // Find elder
  const elder = members.find(m => m.role === 'elder' && !m.deletedAt);
  if (!elder) {
    return { shouldEscalate: false, stage: 0, recipients: [], minutesOverdue };
  }

  // Stage 0: Elder reminder (sent immediately when dose becomes missed)
  if (minutesOverdue < elderToCaretakerMin) {
    return {
      shouldEscalate: true,
      stage: 0,
      recipients: [elder],
      minutesOverdue
    };
  }

  // Stage 1: Caretaker notification
  if (minutesOverdue < elderToCaretakerMin + caretakerToFamilyMin) {
    const caretakers = members.filter(m => m.role === 'caretaker' && !m.deletedAt);
    if (caretakers.length > 0) {
      return {
        shouldEscalate: true,
        stage: 1,
        recipients: caretakers,
        minutesOverdue
      };
    }
  }

  // Stage 2: Family notification
  const family = members.filter(m => m.role === 'family' && !m.deletedAt);
  if (family.length > 0) {
    return {
      shouldEscalate: true,
      stage: 2,
      recipients: family,
      minutesOverdue
    };
  }

  return { shouldEscalate: false, stage: 2, recipients: [], minutesOverdue };
}

/**
 * Check if a dose should be marked as missed (for cron job)
 */
export function shouldMarkAsMissed(
  dose: DoseRecord,
  graceMinutes: number = 30,
  now: Date = new Date()
): boolean {
  if (dose.status !== 'pending') return false;
  const scheduledTime = dose.scheduledAt.getTime();
  const nowTime = now.getTime();
  const minutesOverdue = (nowTime - scheduledTime) / (1000 * 60);
  return minutesOverdue > graceMinutes;
}

/**
 * Get all members who should receive escalation for a dose
 * Returns members grouped by stage
 */
export function getEscalationRecipients(
  members: Member[],
  stage: EscalationStage
): Member[] {
  switch (stage) {
    case 0:
      return members.filter(m => m.role === 'elder' && !m.deletedAt);
    case 1:
      return members.filter(m => m.role === 'caretaker' && !m.deletedAt);
    case 2:
      return members.filter(m => m.role === 'family' && !m.deletedAt);
  }
}

/**
 * Determine if escalation email should be sent based on mute settings
 */
export function shouldSendEscalationEmail(
  member: Member,
  stage: EscalationStage
): boolean {
  if (member.muteSettings.criticalOnly && stage > 0) {
    // If criticalOnly is true, only send stage 0 (elder) reminders
    return false;
  }
  
  switch (stage) {
    case 0:
      return !member.muteSettings.doseReminders;
    case 1:
      return !member.muteSettings.missedDoseAlerts;
    case 2:
      return !member.muteSettings.missedDoseAlerts;
  }
}