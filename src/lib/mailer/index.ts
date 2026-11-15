/**
 * Email mailer using Nodemailer
 * All emails include manage notifications link and List-Unsubscribe header
 * Neutral, non-shaming wording
 */

import nodemailer from 'nodemailer';
import { SignJWT, jwtVerify } from 'jose';
import { EMAIL_FROM, EMAIL_REPLY_TO, SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, AUTH_SECRET, NEXT_PUBLIC_APP_URL } from '@/lib/config';
import { Member, Medication, Appointment, Household } from '@/types';

const encoder = new TextEncoder();
const secretKey = encoder.encode(AUTH_SECRET);

/** Email token payload for manage notifications links */
export interface EmailTokenPayload {
  householdId: string;
  memberId: string;
  type: 'manage' | 'unsubscribe';
  preferences?: Record<string, boolean>;
  exp: number;
}

/**
 * Create signed token for email links
 */
export async function createEmailToken(payload: Omit<EmailTokenPayload, 'exp'>): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setExpirationTime(now + 60 * 60 * 24 * 30) // 30 days
    .sign(secretKey);
}

/**
 * Verify email token
 */
export async function verifyEmailToken(token: string): Promise<EmailTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey, { algorithms: ['HS256'] });
    return payload as unknown as EmailTokenPayload;
  } catch {
    return null;
  }
}

/** Create transporter */
function createTransporter() {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    // Return a mock transporter for development
    return {
      sendMail: async (options: nodemailer.SendMailOptions) => {
        console.log('[MOCK EMAIL]', {
          to: options.to,
          subject: options.subject,
          text: typeof options.text === 'string' ? options.text.substring(0, 200) : undefined
        });
        return { messageId: 'mock-' + Date.now() };
      }
    } as nodemailer.Transporter;
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  });
}

const transporter = createTransporter();

/** Base email template with manage/unsubscribe links */
function getBaseTemplate(content: string, manageUrl: string, unsubscribeUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dirghayu</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #00606B; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #FBF3E4;">
  <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,96,107,0.1);">
    <div style="text-align: center; margin-bottom: 24px;">
      <h1 style="color: #D81B60; margin: 0; font-size: 24px;">Dirghayu</h1>
      <p style="color: #00838F; margin: 8px 0 0;">Long life, on their own terms</p>
    </div>
    ${content}
    <hr style="border: none; border-top: 1px solid #FFB300; margin: 24px 0;">
    <p style="font-size: 13px; color: #5B1033; text-align: center; margin: 0;">
      <a href="${manageUrl}" style="color: #00838F; text-decoration: underline;">Manage notifications</a> • 
      <a href="${unsubscribeUrl}" style="color: #00838F; text-decoration: underline;">Unsubscribe</a>
    </p>
    <p style="font-size: 12px; color: #999; text-align: center; margin: 16px 0 0;">
      This email was sent by Dirghayu for ${NEXT_PUBLIC_APP_URL}. 
      If you didn't expect this, please contact support.
    </p>
  </div>
</body>
</html>
  `.trim();
}

/** Send email with List-Unsubscribe header */
async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text: string,
  listUnsubscribeUrl: string
): Promise<void> {
  await transporter.sendMail({
    from: EMAIL_FROM,
    replyTo: EMAIL_REPLY_TO,
    to,
    subject,
    text,
    html,
    headers: {
      'List-Unsubscribe': `<${listUnsubscribeUrl}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
    }
  });
}

/** Generate manage notifications URL */
export async function getManageUrl(householdId: string, memberId: string, preferences?: Record<string, boolean>): Promise<string> {
  const token = await createEmailToken({ householdId, memberId, type: 'manage', preferences });
  return `${NEXT_PUBLIC_APP_URL}/notifications/manage?token=${encodeURIComponent(token)}`;
}

/** Generate unsubscribe URL */
export async function getUnsubscribeUrl(householdId: string, memberId: string): Promise<string> {
  const token = await createEmailToken({ householdId, memberId, type: 'unsubscribe' });
  return `${NEXT_PUBLIC_APP_URL}/notifications/manage?token=${encodeURIComponent(token)}&action=unsubscribe`;
}

// ============ Specific Email Templates ============

/** Upcoming dose reminder */
export async function sendUpcomingDoseReminder(
  household: Household,
  member: Member,
  elderName: string,
  medication: Medication,
  time: string,
  manageUrl: string,
  unsubscribeUrl: string
): Promise<void> {
  const subject = `Gentle reminder: ${medication.name} at ${time}`;
  const html = getBaseTemplate(`
    <p>Dear ${member.displayName},</p>
    <p>This is a gentle reminder that <strong>${elderName}</strong> has a medication scheduled:</p>
    <div style="background: #FBF3E4; border-radius: 8px; padding: 16px; margin: 16px 0; border-left: 4px solid #00838F;">
      <p style="margin: 0 0 8px;"><strong>${medication.name}</strong> ${medication.dosage}${medication.unit}</p>
      <p style="margin: 0; color: #5B1033;">Time: ${time}</p>
      ${medication.instructions ? `<p style="margin: 8px 0 0; font-size: 14px;">${medication.instructions}</p>` : ''}
    </div>
    <p>You're receiving this because you're part of ${elderName}'s care circle. ${elderName} remains in charge of their own healthcare decisions.</p>
  `, manageUrl, unsubscribeUrl);
  
  const text = `Dear ${member.displayName},\n\nGentle reminder: ${elderName} has ${medication.name} ${medication.dosage}${medication.unit} scheduled at ${time}.\n\nManage notifications: ${manageUrl}\nUnsubscribe: ${unsubscribeUrl}`;
  
  await sendEmail(member.email!, subject, html, text, unsubscribeUrl);
}

/** Missed dose alert (to elder first) */
export async function sendMissedDoseAlert(
  household: Household,
  member: Member,
  elderName: string,
  medication: Medication,
  scheduledTime: string,
  manageUrl: string,
  unsubscribeUrl: string
): Promise<void> {
  const subject = `Missed dose: ${medication.name} was due at ${scheduledTime}`;
  const html = getBaseTemplate(`
    <p>Dear ${elderName},</p>
    <p>It looks like a dose of <strong>${medication.name}</strong> ${medication.dosage}${medication.unit} scheduled for ${scheduledTime} wasn't recorded.</p>
    <p>No worries — this happens. You can mark it as taken, skipped, or let your care circle know you're handling it.</p>
    <div style="background: #FBF3E4; border-radius: 8px; padding: 16px; margin: 16px 0; border-left: 4px solid #FF9933;">
      <p style="margin: 0;"><strong>${medication.name}</strong> ${medication.dosage}${medication.unit}</p>
      <p style="margin: 8px 0 0; color: #5B1033;">Scheduled: ${scheduledTime}</p>
    </div>
    <p>You're in charge of your health. This reminder is here to support you, not to pressure.</p>
  `, manageUrl, unsubscribeUrl);
  
  const text = `Dear ${elderName},\n\nMissed dose alert: ${medication.name} ${medication.dosage}${medication.unit} was due at ${scheduledTime}.\n\nManage notifications: ${manageUrl}\nUnsubscribe: ${unsubscribeUrl}`;
  
  await sendEmail(member.email!, subject, html, text, unsubscribeUrl);
}

/** Escalation to caretaker */
export async function sendCaretakerEscalation(
  household: Household,
  caretaker: Member,
  elderName: string,
  medication: Medication,
  scheduledTime: string,
  minutesOverdue: number,
  manageUrl: string,
  unsubscribeUrl: string
): Promise<void> {
  const subject = `Follow-up: ${elderName} missed ${medication.name} (${minutesOverdue} min ago)`;
  const html = getBaseTemplate(`
    <p>Dear ${caretaker.displayName},</p>
    <p>${elderName} had a dose of <strong>${medication.name}</strong> ${medication.dosage}${medication.unit} scheduled for ${scheduledTime} that hasn't been recorded yet (${minutesOverdue} minutes ago).</p>
    <p>A reminder was already sent to ${elderName}. This follow-up is to keep you informed so you can check in if needed.</p>
    <div style="background: #FBF3E4; border-radius: 8px; padding: 16px; margin: 16px 0; border-left: 4px solid #D81B60;">
      <p style="margin: 0;"><strong>${medication.name}</strong> ${medication.dosage}${medication.unit}</p>
      <p style="margin: 8px 0 0; color: #5B1033;">Scheduled: ${scheduledTime}</p>
    </div>
    <p>${elderName} remains at the center of their care decisions. This notification helps you support them.</p>
  `, manageUrl, unsubscribeUrl);
  
  const text = `Dear ${caretaker.displayName},\n\nFollow-up: ${elderName} missed ${medication.name} ${medication.dosage}${medication.unit} scheduled at ${scheduledTime} (${minutesOverdue} minutes ago).\n\nManage notifications: ${manageUrl}\nUnsubscribe: ${unsubscribeUrl}`;
  
  await sendEmail(caretaker.email!, subject, html, text, unsubscribeUrl);
}

/** Escalation to family */
export async function sendFamilyEscalation(
  household: Household,
  familyMember: Member,
  elderName: string,
  medication: Medication,
  scheduledTime: string,
  minutesOverdue: number,
  manageUrl: string,
  unsubscribeUrl: string
): Promise<void> {
  const subject = `Care update: ${elderName} missed ${medication.name} (${minutesOverdue} min ago)`;
  const html = getBaseTemplate(`
    <p>Dear ${familyMember.displayName},</p>
    <p>${elderName} had a dose of <strong>${medication.name}</strong> ${medication.dosage}${medication.unit} scheduled for ${scheduledTime} that hasn't been recorded (${minutesOverdue} minutes ago).</p>
    <p>Reminders were sent to ${elderName} and their caretaker. This update keeps you informed as part of the care circle.</p>
    <div style="background: #FBF3E4; border-radius: 8px; padding: 16px; margin: 16px 0; border-left: 4px solid #2E3A8C;">
      <p style="margin: 0;"><strong>${medication.name}</strong> ${medication.dosage}${medication.unit}</p>
      <p style="margin: 8px 0 0; color: #5B1033;">Scheduled: ${scheduledTime}</p>
    </div>
    <p>${elderName} leads their own healthcare. This notification supports transparent coordination.</p>
  `, manageUrl, unsubscribeUrl);
  
  const text = `Dear ${familyMember.displayName},\n\nCare update: ${elderName} missed ${medication.name} ${medication.dosage}${medication.unit} scheduled at ${scheduledTime} (${minutesOverdue} minutes ago).\n\nManage notifications: ${manageUrl}\nUnsubscribe: ${unsubscribeUrl}`;
  
  await sendEmail(familyMember.email!, subject, html, text, unsubscribeUrl);
}

/** Upcoming appointment reminder */
export async function sendAppointmentReminder(
  household: Household,
  member: Member,
  elderName: string,
  appointment: Appointment,
  manageUrl: string,
  unsubscribeUrl: string
): Promise<void> {
  const appointmentTime = appointment.scheduledAt.toLocaleString(undefined, { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  const subject = `Upcoming appointment: ${appointment.title} on ${appointmentTime}`;
  const html = getBaseTemplate(`
    <p>Dear ${member.displayName},</p>
    <p>This is a reminder about an upcoming appointment for <strong>${elderName}</strong>:</p>
    <div style="background: #FBF3E4; border-radius: 8px; padding: 16px; margin: 16px 0; border-left: 4px solid #00838F;">
      <p style="margin: 0 0 8px;"><strong>${appointment.title}</strong></p>
      ${appointment.provider ? `<p style="margin: 0 0 8px; color: #5B1033;">With: ${appointment.provider}</p>` : ''}
      <p style="margin: 0 0 8px; color: #5B1033;">Time: ${appointmentTime}</p>
      ${appointment.location ? `<p style="margin: 0 0 8px; color: #5B1033;">Location: ${appointment.location}</p>` : ''}
      ${appointment.description ? `<p style="margin: 8px 0 0; font-size: 14px;">${appointment.description}</p>` : ''}
    </div>
    <p>${elderName} remains in charge of their healthcare decisions. This reminder supports your shared coordination.</p>
  `, manageUrl, unsubscribeUrl);
  
  const text = `Dear ${member.displayName},\n\nUpcoming appointment for ${elderName}: ${appointment.title} on ${appointmentTime}.\n\nManage notifications: ${manageUrl}\nUnsubscribe: ${unsubscribeUrl}`;
  
  await sendEmail(member.email!, subject, html, text, unsubscribeUrl);
}

/** Weekly adherence summary for family */
export async function sendWeeklySummary(
  household: Household,
  member: Member,
  elderName: string,
  summaryHtml: string,
  manageUrl: string,
  unsubscribeUrl: string
): Promise<void> {
  const subject = `Weekly care summary for ${elderName}`;
  const html = getBaseTemplate(`
    <p>Dear ${member.displayName},</p>
    <p>Here's this week's care summary for <strong>${elderName}</strong>:</p>
    ${summaryHtml}
    <p>${elderName} leads their own healthcare journey. This summary keeps you informed.</p>
  `, manageUrl, unsubscribeUrl);
  
  const text = `Dear ${member.displayName},\n\nWeekly care summary for ${elderName}.\n\nManage notifications: ${manageUrl}\nUnsubscribe: ${unsubscribeUrl}`;
  
  await sendEmail(member.email!, subject, html, text, unsubscribeUrl);
}

/** Low refill alert */
export async function sendRefillAlert(
  household: Household,
  member: Member,
  elderName: string,
  medication: Medication,
  daysLeft: number,
  manageUrl: string,
  unsubscribeUrl: string
): Promise<void> {
  const subject = `Refill soon: ${medication.name} (${daysLeft} days left)`;
  const html = getBaseTemplate(`
    <p>Dear ${member.displayName},</p>
    <p><strong>${elderName}</strong>'s medication <strong>${medication.name}</strong> ${medication.dosage}${medication.unit} has approximately ${daysLeft} days of supply remaining.</p>
    <p>You may want to arrange a refill soon to avoid interruption.</p>
    <div style="background: #FBF3E4; border-radius: 8px; padding: 16px; margin: 16px 0; border-left: 4px solid #FFB300;">
      <p style="margin: 0;"><strong>${medication.name}</strong> ${medication.dosage}${medication.unit}</p>
      <p style="margin: 8px 0 0; color: #5B1033;">~${daysLeft} days remaining</p>
    </div>
  `, manageUrl, unsubscribeUrl);
  
  const text = `Dear ${member.displayName},\n\nRefill alert: ${elderName}'s ${medication.name} ${medication.dosage}${medication.unit} has ~${daysLeft} days left.\n\nManage notifications: ${manageUrl}\nUnsubscribe: ${unsubscribeUrl}`;
  
  await sendEmail(member.email!, subject, html, text, unsubscribeUrl);
}

/** Test email */
export async function sendTestEmail(email: string): Promise<void> {
  const manageUrl = `${NEXT_PUBLIC_APP_URL}/notifications/manage`;
  const unsubscribeUrl = `${NEXT_PUBLIC_APP_URL}/notifications/manage?action=unsubscribe`;
  
  const subject = 'Test email from Dirghayu';
  const html = getBaseTemplate(`
    <p>This is a test email from Dirghayu.</p>
    <p>If you received this, email configuration is working correctly.</p>
  `, manageUrl, unsubscribeUrl);
  
  const text = `Test email from Dirghayu.\n\nManage: ${manageUrl}\nUnsubscribe: ${unsubscribeUrl}`;
  
  await sendEmail(email, subject, html, text, unsubscribeUrl);
}