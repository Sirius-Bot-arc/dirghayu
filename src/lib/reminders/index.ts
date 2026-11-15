/**
 * Reminder scheduling and deduplication logic
 * Idempotent reminder emails with dedupe keys
 */

import { Member, Medication, Appointment, DoseRecord, Household } from '@/types';
import { getRepository } from '@/lib/repositories';
import { nowInTimezone, formatLocalTime, minutesUntil, startOfDayInTimezone, endOfDayInTimezone } from '@/lib/time';
import { calculateEscalation, shouldMarkAsMissed, EscalationDecision } from '@/lib/escalation';
import { 
  sendUpcomingDoseReminder, 
  sendMissedDoseAlert, 
  sendCaretakerEscalation, 
  sendFamilyEscalation,
  sendAppointmentReminder,
  sendRefillAlert
} from '@/lib/mailer';
import { getManageUrl, getUnsubscribeUrl } from '@/lib/mailer';

/** Reminder types for deduplication */
export type ReminderType = 
  | 'upcoming_dose' 
  | 'missed_dose' 
  | 'upcoming_appointment' 
  | 'escalation_caretaker' 
  | 'escalation_family'
  | 'refill_low';

/** Generate deduplication key for a reminder */
export function generateDedupeKey(
  householdId: string,
  recipientId: string,
  type: ReminderType,
  referenceId: string,
  stage: number,
  scheduledFor: Date
): string {
  const dateStr = scheduledFor.toISOString().split('T')[0];
  return `reminder:${householdId}:${recipientId}:${type}:${referenceId}:${stage}:${dateStr}`;
}

/** Check and send upcoming dose reminders (15 min before) */
export async function processUpcomingDoseReminders(
  household: Household,
  members: Member[],
  medications: Medication[],
  doses: DoseRecord[]
): Promise<number> {
  const repo = getRepository();
  const now = nowInTimezone(household.timezone);
  const windowStart = new Date(now.getTime() + 10 * 60 * 1000); // 10 min from now
  const windowEnd = new Date(now.getTime() + 20 * 60 * 1000); // 20 min from now
  let sent = 0;

  for (const medication of medications.filter(m => !m.deletedAt)) {
    for (const dose of doses.filter(d => 
      d.medicationId === medication.id && 
      d.status === 'pending' &&
      d.scheduledAt >= windowStart && 
      d.scheduledAt <= windowEnd
    )) {
      const timeStr = formatLocalTime(dose.scheduledAt, household.timezone);
      
      // Send to elder and caretakers who have dose reminders enabled
      for (const member of members.filter(m => 
        !m.deletedAt && 
        m.email && 
        !m.muteSettings.doseReminders &&
        (m.role === 'elder' || m.role === 'caretaker')
      )) {
        const key = generateDedupeKey(household.id, member.id, 'upcoming_dose', medication.id, 0, dose.scheduledAt);
        const canSend = await repo.checkAndSetReminderSent(key);
        
        if (canSend) {
          const manageUrl = await getManageUrl(household.id, member.id);
          const unsubscribeUrl = await getUnsubscribeUrl(household.id, member.id);
          
          await sendUpcomingDoseReminder(
            household, member, 
            members.find(m => m.role === 'elder')?.displayName ?? 'the elder',
            medication, timeStr, manageUrl, unsubscribeUrl
          );
          sent++;
        }
      }
    }
  }

  return sent;
}

/** Check for missed doses and send escalations */
export async function processMissedDoseEscalations(
  household: Household,
  members: Member[],
  medications: Medication[],
  doses: DoseRecord[]
): Promise<number> {
  const repo = getRepository();
  const now = nowInTimezone(household.timezone);
  let sent = 0;

  // First, mark overdue pending doses as missed
  for (const dose of doses.filter(d => d.status === 'pending')) {
    if (shouldMarkAsMissed(dose, 30, now)) {
      await repo.updateDose(dose.id, { status: 'missed', updatedAt: new Date() });
    }
  }

  // Refresh doses
  const updatedDoses = await repo.getDosesByHousehold(household.id);
  const missedDoses = updatedDoses.filter(d => d.status === 'missed');

  for (const dose of missedDoses) {
    const medication = medications.find(m => m.id === dose.medicationId);
    if (!medication || medication.deletedAt) continue;

    const escalation = calculateEscalation(dose, medication, members, now);
    if (!escalation.shouldEscalate || escalation.recipients.length === 0) continue;

    for (const recipient of escalation.recipients) {
      if (!recipient.email) continue;
      
      // Check mute settings
      const shouldSend = escalation.stage === 0 
        ? !recipient.muteSettings.doseReminders
        : !recipient.muteSettings.missedDoseAlerts;
      
      if (!shouldSend) continue;

      const key = generateDedupeKey(
        household.id, 
        recipient.id, 
        escalation.stage === 0 ? 'missed_dose' : 
        escalation.stage === 1 ? 'escalation_caretaker' : 'escalation_family',
        medication.id, 
        escalation.stage, 
        dose.scheduledAt
      );
      
      const canSend = await repo.checkAndSetReminderSent(key);
      if (!canSend) continue;

      const manageUrl = await getManageUrl(household.id, recipient.id);
      const unsubscribeUrl = await getUnsubscribeUrl(household.id, recipient.id);
      const elderName = members.find(m => m.role === 'elder')?.displayName ?? 'the elder';
      const timeStr = formatLocalTime(dose.scheduledAt, household.timezone);

      if (escalation.stage === 0) {
        await sendMissedDoseAlert(household, recipient, elderName, medication, timeStr, manageUrl, unsubscribeUrl);
      } else if (escalation.stage === 1) {
        await sendCaretakerEscalation(household, recipient, elderName, medication, timeStr, escalation.minutesOverdue, manageUrl, unsubscribeUrl);
      } else if (escalation.stage === 2) {
        await sendFamilyEscalation(household, recipient, elderName, medication, timeStr, escalation.minutesOverdue, manageUrl, unsubscribeUrl);
      }
      sent++;
    }
  }

  return sent;
}

/** Check for upcoming appointments (24 hours and 1 hour before) */
export async function processAppointmentReminders(
  household: Household,
  members: Member[],
  appointments: Appointment[]
): Promise<number> {
  const repo = getRepository();
  const now = nowInTimezone(household.timezone);
  let sent = 0;

  for (const appointment of appointments.filter(a => !a.deletedAt && a.status === 'scheduled' && !a.reminderSent)) {
    const minutesUntilApt = minutesUntil(appointment.scheduledAt, household.timezone);
    
    // Send at 24 hours and 1 hour before
    const shouldRemind = (minutesUntilApt <= 24 * 60 && minutesUntilApt > 23 * 60) || 
                         (minutesUntilApt <= 60 && minutesUntilApt > 0);
    
    if (!shouldRemind) continue;

    for (const member of members.filter(m => 
      !m.deletedAt && 
      m.email && 
      !m.muteSettings.appointmentReminders &&
      (m.role === 'elder' || m.role === 'caretaker' || (m.role === 'family' && m.visibility.appointments))
    )) {
      const key = generateDedupeKey(household.id, member.id, 'upcoming_appointment', appointment.id, 0, appointment.scheduledAt);
      const canSend = await repo.checkAndSetReminderSent(key);
      
      if (canSend) {
        const manageUrl = await getManageUrl(household.id, member.id);
        const unsubscribeUrl = await getUnsubscribeUrl(household.id, member.id);
        const elderName = members.find(m => m.role === 'elder')?.displayName ?? 'the elder';
        
        await sendAppointmentReminder(household, member, elderName, appointment, manageUrl, unsubscribeUrl);
        sent++;
      }
    }

    // Mark reminder as sent for this appointment
    await repo.updateAppointment(appointment.id, { reminderSent: true, updatedAt: new Date() });
  }

  return sent;
}

/** Check for low medication stock */
export async function processRefillAlerts(
  household: Household,
  members: Member[],
  medications: Medication[],
  doses: DoseRecord[]
): Promise<number> {
  const repo = getRepository();
  const now = nowInTimezone(household.timezone);
  let sent = 0;

  for (const medication of medications.filter(m => !m.deletedAt && m.stockRemaining !== null && m.stockRemaining! > 0)) {
    // Estimate days remaining based on daily dose count
    const dailyDoses = medication.times.length;
    if (dailyDoses === 0) continue;
    
    const daysLeft = Math.floor(medication.stockRemaining! / dailyDoses);
    if (daysLeft > medication.refillThresholdDays) continue;

    // Check if we already sent alert recently (within 7 days)
    const key = generateDedupeKey(household.id, 'elder', 'refill_low', medication.id, 0, now);
    const canSend = await repo.checkAndSetReminderSent(key);
    if (!canSend) continue;

    // Send to elder and caretakers
    for (const member of members.filter(m => 
      !m.deletedAt && 
      m.email && 
      (m.role === 'elder' || m.role === 'caretaker')
    )) {
      const manageUrl = await getManageUrl(household.id, member.id);
      const unsubscribeUrl = await getUnsubscribeUrl(household.id, member.id);
      const elderName = members.find(m => m.role === 'elder')?.displayName ?? 'the elder';
      
      await sendRefillAlert(household, member, elderName, medication, daysLeft, manageUrl, unsubscribeUrl);
      sent++;
    }
  }

  return sent;
}

/** Main cron handler - processes all reminder types */
export async function processAllReminders(householdId: string): Promise<{
  upcomingDoses: number;
  missedDoses: number;
  appointments: number;
  refills: number;
}> {
  const repo = getRepository();
  
  const household = await repo.getHousehold(householdId as any);
  if (!household) throw new Error('Household not found');
  
  const members = await repo.getMembersByHousehold(householdId as any);
  const medications = await repo.getMedicationsByHousehold(householdId as any);
  const doses = await repo.getDosesByHousehold(householdId as any, startOfDayInTimezone(new Date(), household.timezone), endOfDayInTimezone(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), household.timezone));
  const appointments = await repo.getAppointmentsByHousehold(householdId as any);

  const [upcomingDoses, missedDoses, appointmentsSent, refills] = await Promise.all([
    processUpcomingDoseReminders(household, members, medications, doses),
    processMissedDoseEscalations(household, members, medications, doses),
    processAppointmentReminders(household, members, appointments),
    processRefillAlerts(household, members, medications, doses)
  ]);

  return { upcomingDoses, missedDoses, appointments: appointmentsSent, refills };
}