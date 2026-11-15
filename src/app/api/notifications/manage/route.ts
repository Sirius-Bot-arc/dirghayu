/**
 * GET /api/notifications/manage - Show notification preferences page
 * POST /api/notifications/manage - Update preferences or unsubscribe
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getRepository } from '@/lib/repositories';
import { verifyEmailToken, EmailTokenPayload } from '@/lib/mailer';
import { logActivity } from '@/lib/audit';
import { manageNotificationsSchema } from '@/lib/validation';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const action = searchParams.get('action');

    if (!token) {
      return new NextResponse('Missing token', { status: 400 });
    }

    const payload = await verifyEmailToken(token);
    if (!payload) {
      return new NextResponse('Invalid or expired token', { status: 400 });
    }

    const repo = getRepository();
    const member = await repo.getMember(payload.memberId as any);
    if (!member || member.deletedAt) {
      return new NextResponse('Member not found', { status: 404 });
    }

    // Handle unsubscribe
    if (action === 'unsubscribe' || payload.type === 'unsubscribe') {
      await repo.updateMember(payload.memberId as any, {
        muteSettings: {
          doseReminders: true,
          missedDoseAlerts: true,
          appointmentReminders: true,
          criticalOnly: true
        }
      });

      await logActivity({
        householdId: payload.householdId as any,
        memberId: payload.memberId as any,
        action: 'member_updated',
        resourceType: 'member',
        resourceId: payload.memberId,
        metadata: { action: 'unsubscribe_all' }
      });

      return new NextResponse(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Unsubscribed - Dirghayu</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 600px; margin: 40px auto; padding: 20px; background: #FBF3E4; color: #00606B; }
    .card { background: white; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,96,107,0.1); text-align: center; }
    h1 { color: #D81B60; margin-top: 0; }
    .success { color: #00838F; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Dirghayu</h1>
    <p class="success">You have been unsubscribed from all notifications.</p>
    <p>You will no longer receive any emails from Dirghayu for this household.</p>
    <p>To re-enable notifications, log in to the app and update your preferences.</p>
  </div>
</body>
</html>
      `, { headers: { 'Content-Type': 'text/html' } });
    }

    // Show preferences page
    return new NextResponse(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Notification Preferences - Dirghayu</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 600px; margin: 40px auto; padding: 20px; background: #FBF3E4; color: #00606B; }
    .card { background: white; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,96,107,0.1); }
    h1 { color: #D81B60; margin-top: 0; }
    .field { margin-bottom: 16px; }
    label { display: flex; align-items: center; gap: 12px; cursor: pointer; font-size: 16px; }
    input[type="checkbox"] { width: 20px; height: 20px; accent-color: #00838F; }
    .warning { background: #FFF3E0; border-left: 4px solid #FF9933; padding: 12px; margin: 16px 0; border-radius: 0 8px 8px 0; font-size: 14px; }
    button { background: #D81B60; color: #FBF3E4; border: none; padding: 12px 24px; border-radius: 8px; font-size: 16px; cursor: pointer; width: 100%; }
    button:hover { background: #C2185B; }
    .unsubscribe-link { display: block; text-align: center; margin-top: 16px; color: #00838F; text-decoration: underline; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Notification Preferences</h1>
    <p>Manage email notifications for <strong>${member.displayName}</strong></p>
    
    <form id="prefsForm">
      <div class="field">
        <label>
          <input type="checkbox" name="doseReminders" ${member.muteSettings.doseReminders ? '' : 'checked'}>
          Dose reminders (15 min before scheduled time)
        </label>
      </div>
      <div class="field">
        <label>
          <input type="checkbox" name="missedDoseAlerts" ${member.muteSettings.missedDoseAlerts ? '' : 'checked'}>
          Missed dose alerts & escalation notifications
        </label>
      </div>
      <div class="field">
        <label>
          <input type="checkbox" name="appointmentReminders" ${member.muteSettings.appointmentReminders ? '' : 'checked'}>
          Appointment reminders (24 hours & 1 hour before)
        </label>
      </div>
      <div class="field">
        <label>
          <input type="checkbox" name="weeklySummary" ${member.muteSettings.criticalOnly ? '' : 'checked'}>
          Weekly adherence summary (family only)
        </label>
      </div>
      <div class="field">
        <label>
          <input type="checkbox" name="refillAlerts" ${member.muteSettings.criticalOnly ? '' : 'checked'}>
          Low medication refill alerts
        </label>
      </div>
      <div class="field">
        <label>
          <input type="checkbox" name="criticalOnly" ${member.muteSettings.criticalOnly ? 'checked' : ''}>
          Critical only (only urgent missed dose escalations)
        </label>
      </div>
      <div class="warning">
        <strong>⚠ Note:</strong> Disabling missed dose alerts means you won't be notified if doses are missed. The elder will still receive their own reminders.
      </div>
      <button type="submit">Save Preferences</button>
    </form>
    <a href="${new URL(`/api/notifications/manage?token=${token}&action=unsubscribe`, request.url).toString()}" class="unsubscribe-link">Unsubscribe from all emails</a>
  </div>
  <script>
    document.getElementById('prefsForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const prefs = {
        doseReminders: formData.has('doseReminders'),
        missedDoseAlerts: formData.has('missedDoseAlerts'),
        appointmentReminders: formData.has('appointmentReminders'),
        weeklySummary: formData.has('weeklySummary'),
        refillAlerts: formData.has('refillAlerts')
      };
      const res = await fetch(window.location.pathname + '?token=' + '${token}', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: '${token}', action: 'preferences', preferences: prefs })
      });
      if (res.ok) {
        alert('Preferences saved!');
      } else {
        alert('Failed to save preferences');
      }
    });
  </script>
</body>
</html>
    `, { headers: { 'Content-Type': 'text/html' } });
  } catch (error) {
    console.error('Notifications manage GET error:', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = manageNotificationsSchema.parse(body);

    const payload = await verifyEmailToken(validated.token);
    if (!payload) {
      return NextResponse.json({ success: false, error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' }}, { status: 400 });
    }

    const repo = getRepository();
    const member = await repo.getMember(payload.memberId as any);
    if (!member || member.deletedAt) {
      return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Member not found' }}, { status: 404 });
    }

    if (validated.action === 'unsubscribe') {
      await repo.updateMember(payload.memberId as any, {
        muteSettings: {
          doseReminders: true,
          missedDoseAlerts: true,
          appointmentReminders: true,
          criticalOnly: true
        }
      });

      await logActivity({
        householdId: payload.householdId as any,
        memberId: payload.memberId as any,
        action: 'member_updated',
        resourceType: 'member',
        resourceId: payload.memberId,
        metadata: { action: 'unsubscribe_all' }
      });

      return NextResponse.json({ success: true, message: 'Unsubscribed from all notifications' });
    }

    if (validated.action === 'preferences' && validated.preferences) {
      const { criticalOnly, ...prefs } = validated.preferences;
      await repo.updateMember(payload.memberId as any, {
        muteSettings: {
          ...member.muteSettings,
          ...prefs,
          criticalOnly: criticalOnly ?? member.muteSettings.criticalOnly
        }
      });

      await logActivity({
        householdId: payload.householdId as any,
        memberId: payload.memberId as any,
        action: 'member_updated',
        resourceType: 'member',
        resourceId: payload.memberId,
        metadata: { action: 'update_preferences', preferences: validated.preferences }
      });

      return NextResponse.json({ success: true, message: 'Preferences updated' });
    }

    return NextResponse.json({ success: false, error: { code: 'INVALID_ACTION', message: 'Invalid action' }}, { status: 400 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: error.flatten().fieldErrors }}, { status: 400 });
    }
    console.error('Notifications manage POST error:', error);
    return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to manage notifications' }}, { status: 500 });
  }
}